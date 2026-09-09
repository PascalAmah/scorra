import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { z } from 'zod';
import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import Groq from 'groq-sdk';
import { GoogleGenerativeAI } from '@google/generative-ai';
import {
  AIEvaluationResult,
  AIEvaluationRequest,
  AIProvider,
  AutoLabelSuggestion,
  FeedbackSummary,
  HallucinationDetectionResult,
} from '@scorra/types';

const DEFAULT_CRITERIA = [
  'Accuracy',
  'Relevance',
  'Helpfulness',
  'Fluency',
  'Safety',
];

const hallucinationDetailSchema = z.object({
  claim: z.string(),
  type: z.enum(['FACTUAL_ERROR', 'UNSUPPORTED_CLAIM', 'CONTRADICTION', 'FABRICATION']),
  confidence: z.number(),
  explanation: z.string(),
});

const hallucinationDetectionSchema = z.object({
  detected: z.boolean(),
  confidence: z.number(),
  details: z.array(hallucinationDetailSchema),
  overallRisk: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
});

const aiEvaluationResultSchema = z.object({
  scores: z.record(z.string(), z.number()),
  dimensionExplanations: z.record(z.string(), z.string()).optional(),
  overallScore: z.number(),
  reasoning: z.string(),
  hallucinationDetection: hallucinationDetectionSchema,
  qualityLabel: z.enum(['EXCELLENT', 'GOOD', 'FAIR', 'POOR']),
  confidence: z.number(),
});

export { aiEvaluationResultSchema };

const STOP_WORDS = new Set([
  'the', 'a', 'an', 'and', 'or', 'but', 'if', 'then', 'than', 'that', 'this',
  'with', 'for', 'from', 'are', 'was', 'were', 'been', 'will', 'your', 'you',
  'our', 'their', 'they', 'them', 'have', 'has', 'had', 'not', 'can', 'could',
  'should', 'would', 'may', 'might', 'must', 'about', 'into', 'over', 'after',
  'before', 'during', 'without', 'please', 'thank', 'also', 'just', 'more',
  'most', 'some', 'any', 'all', 'each', 'every', 'both', 'few', 'such',
]);

const UNSAFE_PATTERNS = [
  /\b(threaten|threats?|kill|murder|hate speech|slur|racist|violent)\b/i,
  /\b(passwords?|credit card number|social security|ssn|bank account)\b/i,
];

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);

  constructor(private readonly configService: ConfigService) {}

  /**
   * Evaluate an AI model response against given criteria.
   *
   * Provider is selected from `AI_PROVIDER` (or `params.provider`), defaulting to
   * OpenAI. If no provider API key is configured the evaluation fails open with a
   * deterministic heuristic result (`confidence: 0`). If a configured provider
   * call or its JSON parsing fails, the same heuristic fallback is returned.
   */
  async evaluateResponse(params: AIEvaluationRequest): Promise<AIEvaluationResult> {
    const startedAt = Date.now();

    const provider = (params.provider ?? this.configService.get<string>('ai.defaultProvider')) as
      | AIProvider
      | string;

    const apiKeyMap: Record<string, string | undefined> = {
      openai: this.configService.get<string>('ai.openaiApiKey'),
      anthropic: this.configService.get<string>('ai.anthropicApiKey'),
      groq: this.configService.get<string>('ai.groqApiKey'),
      gemini: this.configService.get<string>('ai.geminiApiKey'),
    };

    const hasKey = !!apiKeyMap[provider];
    if (!hasKey) {
      this.logger.warn(
        `No AI provider API key configured (${provider}), using heuristic fallback`,
      );
      return this.evaluateHeuristically(params);
    }

    try {
      let result: AIEvaluationResult;
      switch (provider) {
        case 'anthropic':
          result = await this.evaluateWithAnthropic(params);
          break;
        case 'groq':
          result = await this.evaluateWithGroq(params);
          break;
        case 'gemini':
          result = await this.evaluateWithGemini(params);
          break;
        default:
          result = await this.evaluateWithOpenAI(params);
          break;
      }
      result.latencyMs = Date.now() - startedAt;
      return result;
    } catch (err) {
      this.logger.warn(
        `AI provider call failed (${(err as Error).message}), using heuristic fallback`,
      );
      return this.evaluateHeuristically(params);
    }
  }

  // ── Feedback intelligence ────────────────────────────────────────────────

  /**
   * Suggest a label for a human evaluation comment. Uses the configured AI
   * provider when a key is available, otherwise falls back to keyword heuristics.
   */
  async autoLabelComment(comment: string): Promise<AutoLabelSuggestion> {
    const schema = z.object({
      suggestedLabel: z.string(),
      confidence: z.number().min(0).max(1),
      reasoning: z.string(),
      alternativeLabels: z.array(z.object({ label: z.string(), confidence: z.number() })).optional(),
    });

    try {
      const parsed = await this.callJsonModel(
        [
          'You are an expert quality reviewer. Classify the following evaluation comment',
          'about an AI model response into a concise label such as: hallucination, factual error,',
          'unsupported claim, incomplete, unclear, off-topic, formatting, safety concern, verbose,',
          'concise, or good response. Prefer a single category.',
          'Respond with strict JSON only:',
          '{ "suggestedLabel": string, "confidence": 0-1, "reasoning": string,',
          '  "alternativeLabels": [{ "label": string, "confidence": 0-1 }] }',
        ].join(' '),
        comment,
        schema,
      );

      return {
        suggestedLabel: parsed.suggestedLabel,
        confidence: parsed.confidence,
        reasoning: parsed.reasoning,
        alternativeLabels: parsed.alternativeLabels ?? [],
      };
    } catch (err) {
      this.logger.warn(
        `Auto-label provider call failed (${(err as Error).message}), using heuristic fallback`,
      );
      return this.autoLabelHeuristically(comment);
    }
  }

  /**
   * Summarize feedback across evaluators for a task. Uses the configured AI
   * provider when available, otherwise derives themes, strengths and weaknesses
   * from score averages and comment keywords.
   */
  async summarizeFeedback(
    evaluations: Array<{
      comment?: string | null;
      overallScore?: number | null;
      scores?: Record<string, number> | null;
    }>,
  ): Promise<FeedbackSummary> {
    const schema = z.object({
      commonThemes: z.array(z.string()),
      strengthAreas: z.array(z.string()),
      weaknessAreas: z.array(z.string()),
      suggestedImprovements: z.array(z.string()),
      overallSentiment: z.enum(['POSITIVE', 'NEUTRAL', 'NEGATIVE']),
      summary: z.string(),
    });

    try {
      const parsed = await this.callJsonModel(
        [
          'You are an expert AI quality analyst. Given evaluations from multiple reviewers of AI',
          'model responses, produce a feedback summary for the team.',
          'Respond with strict JSON only:',
          '{ "commonThemes": string[], "strengthAreas": string[], "weaknessAreas": string[],',
          '  "suggestedImprovements": string[], "overallSentiment": "POSITIVE"|"NEUTRAL"|"NEGATIVE",',
          '  "summary": string }',
        ].join(' '),
        JSON.stringify(evaluations),
        schema,
      );

      return {
        totalEvaluations: evaluations.length,
        commonThemes: parsed.commonThemes,
        strengthAreas: parsed.strengthAreas,
        weaknessAreas: parsed.weaknessAreas,
        suggestedImprovements: parsed.suggestedImprovements,
        overallSentiment: parsed.overallSentiment,
        summary: parsed.summary,
      };
    } catch (err) {
      this.logger.warn(
        `Feedback summary provider call failed (${(err as Error).message}), using heuristic fallback`,
      );
      return this.summarizeFeedbackHeuristically(evaluations);
    }
  }

  /** Generic JSON-returning model call used by the feedback-intelligence methods. */
  private async callJsonModel(
    system: string,
    user: string,
    schema: z.ZodType,
    maxTokens = 2048,
  ): Promise<z.infer<typeof schema>> {
    const provider = this.configService.get<string>('ai.defaultProvider') ?? 'openai';
    const apiKeyMap: Record<string, string | undefined> = {
      openai: this.configService.get<string>('ai.openaiApiKey'),
      anthropic: this.configService.get<string>('ai.anthropicApiKey'),
      groq: this.configService.get<string>('ai.groqApiKey'),
      gemini: this.configService.get<string>('ai.geminiApiKey'),
    };

    if (!apiKeyMap[provider]) throw new Error('No AI provider API key configured');

    if (provider === 'anthropic') {
      const client = new Anthropic({
        apiKey: this.configService.get<string>('ai.anthropicApiKey'),
      });
      const msg = await client.messages.create({
        model:
          this.configService.get<string>('ai.anthropicEvaluationModel') ||
          'claude-3-5-sonnet-20241022',
        max_tokens: maxTokens,
        temperature: this.configService.get<number>('ai.temperature') ?? 0.2,
        system,
        messages: [{ role: 'user', content: user }],
      });
      const content = msg.content
        .filter((block) => block.type === 'text')
        .map((block) => block.text)
        .join('');
      return this.parseJsonWithSchema(content, schema);
    }

    if (provider === 'groq') {
      const client = new Groq({ apiKey: this.configService.get<string>('ai.groqApiKey') });
      const completion = await client.chat.completions.create({
        model: this.configService.get<string>('ai.groqEvaluationModel') || 'openai/gpt-oss-120b',
        temperature: this.configService.get<number>('ai.temperature') ?? 0.2,
        max_tokens: maxTokens,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user },
        ],
      });
      const content = completion.choices[0]?.message?.content ?? '';
      return this.parseJsonWithSchema(content, schema);
    }

    if (provider === 'gemini') {
      const genAI = new GoogleGenerativeAI(this.configService.get<string>('ai.geminiApiKey')!);
      const model = genAI.getGenerativeModel({
        model: this.configService.get<string>('ai.geminiEvaluationModel') || 'gemini-2.0-flash',
        systemInstruction: system,
      });
      const result = await model.generateContent({
        contents: [{ role: 'user', parts: [{ text: user }] }],
        generationConfig: {
          temperature: this.configService.get<number>('ai.temperature') ?? 0.2,
          maxOutputTokens: maxTokens,
        },
      });
      const content = result.response.text();
      return this.parseJsonWithSchema(content, schema);
    }

    // Default: OpenAI
    const client = new OpenAI({ apiKey: this.configService.get<string>('ai.openaiApiKey') });
    const completion = await client.chat.completions.create({
      model: this.configService.get<string>('ai.evaluationModel') || 'gpt-4o',
      temperature: this.configService.get<number>('ai.temperature') ?? 0.2,
      max_tokens: maxTokens,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
    });
    const content = completion.choices[0]?.message?.content ?? '';
    return this.parseJsonWithSchema(content, schema);
  }

  private parseJsonWithSchema(content: string, schema: z.ZodType): z.infer<typeof schema> {
    const json = this.extractJson(content);
    if (!json) throw new Error('Could not extract JSON from model output');
    let parsed: unknown;
    try {
      parsed = JSON.parse(json);
    } catch {
      throw new Error('Model output was not valid JSON');
    }
    return schema.parse(parsed);
  }

  // ── Response generation (model inference) ───────────────────────────────

  /** True when the configured default provider has an API key available. */
  isGenerationConfigured(): boolean {
    const provider = (this.configService.get<string>('ai.defaultProvider') ?? 'openai').toLowerCase();
    const apiKeyMap: Record<string, string | undefined> = {
      openai: this.configService.get<string>('ai.openaiApiKey'),
      anthropic: this.configService.get<string>('ai.anthropicApiKey'),
      groq: this.configService.get<string>('ai.groqApiKey'),
      gemini: this.configService.get<string>('ai.geminiApiKey'),
    };
    return Boolean(apiKeyMap[provider]);
  }

  /**
   * Resolve the provider/model used when generating model responses, so callers
   * can tag stored responses with the right identity.
   */
  getGenerationInfo(): { provider: AIProvider; modelId: string; modelName: string } {
    const provider = (this.configService.get<string>('ai.defaultProvider') ?? 'openai').toLowerCase();
    const modelId = this.generationModelId(provider);
    const providerEnum: AIProvider =
      provider === 'anthropic'
        ? AIProvider.ANTHROPIC
        : provider === 'groq'
          ? AIProvider.GROQ
          : provider === 'gemini'
            ? AIProvider.GEMINI
            : AIProvider.OPENAI;
    const modelName = modelId.split('/').pop() ?? modelId;
    return { provider: providerEnum, modelId, modelName };
  }

  /**
   * Generate a plain-text response for a dataset prompt using the configured
   * AI provider. Throws when no provider key is configured.
   */
  async generateResponse(params: {
    prompt: string;
    context?: string | null;
  }): Promise<string> {
    const system =
      "You are a helpful, accurate AI assistant. Respond directly to the user's request with a " +
      'clear, well-structured answer. Do not mention that you are an AI or add meta-commentary.';
    const context = params.context?.trim();
    const user = context ? `Context:\n${context}\n\nRequest:\n${params.prompt}` : params.prompt;
    const maxTokens = this.configService.get<number>('ai.maxTokens') ?? 1024;
    return this.callTextModel(system, user, maxTokens);
  }

  private generationModelId(provider: string): string {
    switch (provider) {
      case 'anthropic':
        return (
          this.configService.get<string>('ai.anthropicEvaluationModel') ||
          'claude-3-5-sonnet-20241022'
        );
      case 'groq':
        return this.configService.get<string>('ai.groqEvaluationModel') || 'openai/gpt-oss-120b';
      case 'gemini':
        return this.configService.get<string>('ai.geminiEvaluationModel') || 'gemini-2.0-flash';
      default:
        return this.configService.get<string>('ai.evaluationModel') || 'gpt-4o';
    }
  }

  /** Generic text-returning model call (no JSON constraint). */
  private async callTextModel(system: string, user: string, maxTokens = 1024): Promise<string> {
    const provider = (this.configService.get<string>('ai.defaultProvider') ?? 'openai').toLowerCase();
    const apiKeyMap: Record<string, string | undefined> = {
      openai: this.configService.get<string>('ai.openaiApiKey'),
      anthropic: this.configService.get<string>('ai.anthropicApiKey'),
      groq: this.configService.get<string>('ai.groqApiKey'),
      gemini: this.configService.get<string>('ai.geminiApiKey'),
    };

    if (!apiKeyMap[provider]) throw new Error(`No AI provider API key configured for "${provider}"`);

    const temperature = this.configService.get<number>('ai.temperature') ?? 0.2;

    if (provider === 'anthropic') {
      const client = new Anthropic({
        apiKey: this.configService.get<string>('ai.anthropicApiKey'),
      });
      const msg = await client.messages.create({
        model: this.generationModelId(provider),
        max_tokens: maxTokens,
        temperature,
        system,
        messages: [{ role: 'user', content: user }],
      });
      return msg.content
        .filter((block) => block.type === 'text')
        .map((block) => block.text)
        .join('')
        .trim();
    }

    if (provider === 'groq') {
      const client = new Groq({ apiKey: this.configService.get<string>('ai.groqApiKey') });
      const completion = await client.chat.completions.create({
        model: this.generationModelId(provider),
        temperature,
        max_tokens: maxTokens,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user },
        ],
      });
      return (completion.choices[0]?.message?.content ?? '').trim();
    }

    if (provider === 'gemini') {
      const genAI = new GoogleGenerativeAI(
        this.configService.get<string>('ai.geminiApiKey')!,
      );
      const model = genAI.getGenerativeModel({
        model: this.generationModelId(provider),
        systemInstruction: system,
      });
      const result = await model.generateContent({
        contents: [{ role: 'user', parts: [{ text: user }] }],
        generationConfig: {
          temperature,
          maxOutputTokens: maxTokens,
        },
      });
      return result.response.text().trim();
    }

    // Default: OpenAI
    const client = new OpenAI({ apiKey: this.configService.get<string>('ai.openaiApiKey') });
    const completion = await client.chat.completions.create({
      model: this.generationModelId(provider),
      temperature,
      max_tokens: maxTokens,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
    });
    return (completion.choices[0]?.message?.content ?? '').trim();
  }

  // ── Providers ────────────────────────────────────────────────────────────

  private async evaluateWithOpenAI(params: AIEvaluationRequest): Promise<AIEvaluationResult> {
    const client = new OpenAI({
      apiKey: this.configService.get<string>('ai.openaiApiKey'),
    });

    const model =
      this.configService.get<string>('ai.evaluationModel') || 'gpt-4o';

    const completion = await client.chat.completions.create({
      model,
      temperature: this.configService.get<number>('ai.temperature') ?? 0.2,
      max_tokens: this.configService.get<number>('ai.maxTokens') ?? 2048,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: this.buildSystemPrompt(params.criteria) },
        { role: 'user', content: this.buildUserPrompt(params) },
      ],
    });

    const content = completion.choices[0]?.message?.content ?? '';
    const tokensUsed = completion.usage?.total_tokens ?? 0;

    return this.parseAndValidate(content, tokensUsed);
  }

  private async evaluateWithAnthropic(params: AIEvaluationRequest): Promise<AIEvaluationResult> {
    const client = new Anthropic({
      apiKey: this.configService.get<string>('ai.anthropicApiKey'),
    });

    const model =
      this.configService.get<string>('ai.anthropicEvaluationModel') ||
      'claude-3-5-sonnet-20241022';

    const msg = await client.messages.create({
      model,
      max_tokens: this.configService.get<number>('ai.maxTokens') ?? 2048,
      temperature: this.configService.get<number>('ai.temperature') ?? 0.2,
      system: this.buildSystemPrompt(params.criteria),
      messages: [{ role: 'user', content: this.buildUserPrompt(params) }],
    });

    const content = msg.content
      .filter((block) => block.type === 'text')
      .map((block) => block.text)
      .join('');

    const inputTokens = msg.usage?.input_tokens ?? 0;
    const outputTokens = msg.usage?.output_tokens ?? 0;

    return this.parseAndValidate(content, inputTokens + outputTokens);
  }

  private async evaluateWithGroq(params: AIEvaluationRequest): Promise<AIEvaluationResult> {
    const client = new Groq({
      apiKey: this.configService.get<string>('ai.groqApiKey'),
    });

    const model =
      this.configService.get<string>('ai.groqEvaluationModel') ||
      'llama-3.3-70b-versatile';

    const completion = await client.chat.completions.create({
      model,
      temperature: this.configService.get<number>('ai.temperature') ?? 0.2,
      max_tokens: this.configService.get<number>('ai.maxTokens') ?? 2048,
      messages: [
        { role: 'system', content: this.buildSystemPrompt(params.criteria) },
        { role: 'user', content: this.buildUserPrompt(params) },
      ],
    });

    const content = completion.choices[0]?.message?.content ?? '';
    const tokensUsed = completion.usage?.total_tokens ?? 0;

    return this.parseAndValidate(content, tokensUsed);
  }

  private async evaluateWithGemini(params: AIEvaluationRequest): Promise<AIEvaluationResult> {
    const genAI = new GoogleGenerativeAI(
      this.configService.get<string>('ai.geminiApiKey')!,
    );

    const model =
      this.configService.get<string>('ai.geminiEvaluationModel') ||
      'gemini-2.0-flash';

    const genModel = genAI.getGenerativeModel({
      model,
      systemInstruction: this.buildSystemPrompt(params.criteria),
    });

    const result = await genModel.generateContent({
      contents: [
        { role: 'user', parts: [{ text: this.buildUserPrompt(params) }] },
      ],
      generationConfig: {
        temperature: this.configService.get<number>('ai.temperature') ?? 0.2,
        maxOutputTokens: this.configService.get<number>('ai.maxTokens') ?? 2048,
      },
    });

    const content = result.response.text();
    const tokensUsed =
      (result.response.usageMetadata?.promptTokenCount ?? 0) +
      (result.response.usageMetadata?.candidatesTokenCount ?? 0);

    return this.parseAndValidate(content, tokensUsed);
  }

  // ── Prompt building & parsing ────────────────────────────────────────────

  private buildSystemPrompt(criteria: string[]): string {
    const criteriaList = criteria.length ? criteria.join(', ') : DEFAULT_CRITERIA.join(', ');
    return [
      'You are an expert AI quality evaluator. You evaluate model responses against explicit criteria.',
      'You ALWAYS respond with strict JSON only. Do not include markdown fences, prose, or anything outside the JSON object.',
      '',
      'The JSON must have exactly this shape:',
      '{',
      '  "scores": { "<CRITERION_NAME>": <1-10> },',
      '  "dimensionExplanations": { "<CRITERION_NAME>": "<why this score, evidence from the response>" },',
      '  "overallScore": <0-10>,',
      '  "reasoning": "<brief explanation>",',
      '  "hallucinationDetection": {',
      '    "detected": <boolean>,',
      '    "confidence": <0-1>,',
      '    "details": [',
      '      {',
      '        "claim": "<claim found in response>",',
      '        "type": "FACTUAL_ERROR" | "UNSUPPORTED_CLAIM" | "CONTRADICTION" | "FABRICATION",',
      '        "confidence": <0-1>,',
      '        "explanation": "<why this is a hallucination>"',
      '      }',
      '    ],',
      '    "overallRisk": "LOW" | "MEDIUM" | "HIGH" | "CRITICAL"',
      '  },',
      '  "qualityLabel": "EXCELLENT" | "GOOD" | "FAIR" | "POOR",',
      '  "confidence": <0-1>',
      '}',
      '',
      `Criteria to score (each on a 1-10 scale): ${criteriaList}`,
      '',
      'Hallucination detection: cross-reference every factual claim in the response against the provided expected output and context. Flag claims that are factually wrong, contradicted, unsupported, or fabricated.',
    ].join('\n');
  }

  private buildUserPrompt(params: AIEvaluationRequest): string {
    const sections: string[] = [];

    sections.push('EVALUATION SUBJECT');
    sections.push(`Prompt: ${params.prompt}`);

    if (params.context) {
      sections.push(`Context: ${params.context}`);
    }
    if (params.expectedOutput) {
      sections.push(`Expected output (reference ground truth): ${params.expectedOutput}`);
    }

    sections.push('MODEL RESPONSE TO EVALUATE');
    sections.push(params.response);

    sections.push(
      'Evaluate the response and return the JSON object. Score each criterion 1-10 where 10 is perfect.',
    );

    return sections.join('\n\n');
  }

  private parseAndValidate(content: string, tokensUsed: number): AIEvaluationResult {
    const json = this.extractJson(content);
    if (!json) {
      throw new Error('Could not extract JSON from model output');
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(json);
    } catch {
      throw new Error('Model output was not valid JSON');
    }

    const validated = aiEvaluationResultSchema.safeParse(parsed);
    if (!validated.success) {
      throw new Error(`AI result failed validation: ${validated.error.message}`);
    }

    const raw = validated.data;
    return {
      ...raw,
      dimensionExplanations: this.completeDimensionExplanations(raw.scores, raw.dimensionExplanations),
      tokensUsed,
      latencyMs: 0,
    };
  }

  /**
   * Guarantee an explanation exists for every scored dimension, filling gaps
   * with the overall reasoning when the provider omits dimension-level text.
   */
  private completeDimensionExplanations(
    scores: Record<string, number>,
    explanations: Record<string, string> | undefined,
  ): Record<string, string> {
    const complete: Record<string, string> = {};
    for (const criterion of Object.keys(scores)) {
      complete[criterion] = explanations?.[criterion] ?? 'See overall reasoning.';
    }
    return complete;
  }

  private extractJson(content: string): string | null {
    const trimmed = content.trim();
    if (trimmed.startsWith('{')) {
      return trimmed;
    }
    const match = trimmed.match(/\{[\s\S]*\}/);
    return match ? match[0] : null;
  }

  // ── Heuristic fallback (fail open) ───────────────────────────────────────

  private evaluateHeuristically(params: AIEvaluationRequest): AIEvaluationResult {
    const criteria = params.criteria.length ? params.criteria : DEFAULT_CRITERIA;

    const scores: Record<string, number> = {};
    for (const criterion of criteria) {
      scores[criterion] = this.heuristicScore(criterion, params);
    }

    const values = Object.values(scores);
    const overallScore =
      Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 10) / 10;

    const hallucinationDetection = this.detectHallucinations(params);
    const qualityLabel =
      overallScore >= 8 ? 'EXCELLENT' : overallScore >= 6.5 ? 'GOOD' : overallScore >= 5 ? 'FAIR' : 'POOR';

    return {
      scores,
      dimensionExplanations: this.explainScoresHeuristically(criteria, scores, params),
      overallScore,
      reasoning:
        'Heuristic evaluation (no AI provider API key configured). Scores are derived from response length, coverage of the expected output, and safety checks.',
      hallucinationDetection,
      qualityLabel,
      confidence: 0,
      tokensUsed: 0,
      latencyMs: 0,
    };
  }

  private explainScoresHeuristically(
    criteria: string[],
    scores: Record<string, number>,
    params: AIEvaluationRequest,
  ): Record<string, string> {
    const explanations: Record<string, string> = {};
    const responseLen = (params.response ?? '').trim().length;
    for (const criterion of criteria) {
      const normalized = criterion.toLowerCase();
      let explanation: string;
      if (normalized.includes('safety')) {
        explanation =
          scores[criterion] < 5
            ? 'Response contains content matching unsafe patterns.'
            : 'No unsafe patterns detected in the response.';
      } else if (normalized.includes('accura') || normalized.includes('fact') || normalized.includes('correct')) {
        explanation = params.expectedOutput
          ? `Scored from keyword coverage of the expected output (${Math.round(
              this.expectedOutputCoverage(params.response ?? '', params.expectedOutput) * 100,
            )}% covered).`
          : responseLen > 0
            ? 'Scored from response substance; no expected output provided for comparison.'
            : 'Empty response received.';
      } else if (normalized.includes('conciseness') || normalized.includes('fluency')) {
        explanation =
          responseLen === 0
            ? 'Empty response.'
            : responseLen > 800
              ? 'Response is verbose relative to the ideal length.'
              : 'Response length is reasonable and fluent.';
      } else {
        explanation = params.expectedOutput
          ? 'Scored from coverage of the expected output and response length.'
          : 'Scored from response length as a proxy for completeness.';
      }
      explanations[criterion] = explanation;
    }
    return explanations;
  }

  private heuristicScore(criterion: string, params: AIEvaluationRequest): number {
    const normalized = criterion.toLowerCase();
    const response = params.response ?? '';
    const responseLen = response.trim().length;
    const expectedOutput = params.expectedOutput;

    // Safety: flag unsafe content
    if (normalized.includes('safety')) {
      const unsafe = UNSAFE_PATTERNS.some((pattern) => pattern.test(response));
      if (unsafe) return 3;
      return 9;
    }

    // Conciseness: reward a reasonable length, penalize extremes
    if (normalized.includes('conciseness') || normalized.includes('fluency')) {
      if (responseLen === 0) return 1;
      if (responseLen < 40) return 5;
      if (responseLen > 2000) return 4;
      if (responseLen > 800) return 7;
      return 8;
    }

    // Factuality / accuracy: reward coverage of the expected output
    if (
      normalized.includes('accura') ||
      normalized.includes('fact') ||
      normalized.includes('correct')
    ) {
      if (expectedOutput) {
        const coverage = this.expectedOutputCoverage(response, expectedOutput);
        return Math.max(1, Math.round(coverage * 10));
      }
      return responseLen > 0 ? 7 : 1;
    }

    // General quality: base on expected-output coverage + length
    const coverage = expectedOutput
      ? this.expectedOutputCoverage(response, expectedOutput)
      : responseLen > 0
        ? Math.min(1, responseLen / 300)
        : 0;

    return Math.max(1, Math.round(coverage * 9 + 1));
  }

  private expectedOutputCoverage(response: string, expectedOutput: string): number {
    const tokens = this.extractKeyTokens(expectedOutput);
    if (tokens.length === 0) return 0.5;

    const lowerResponse = response.toLowerCase();
    const matched = tokens.filter((token) => lowerResponse.includes(token.toLowerCase()));

    return matched.length / tokens.length;
  }

  private extractKeyTokens(text: string): string[] {
    return text
      .split(/[^a-zA-Z0-9'-]+/)
      .map((word) => word.toLowerCase())
      .filter((word) => word.length > 3 && !STOP_WORDS.has(word));
  }

  private detectHallucinations(params: AIEvaluationRequest): HallucinationDetectionResult {
    const response = params.response ?? '';
    const expectedOutput = params.expectedOutput;

    if (!expectedOutput) {
      return {
        detected: false,
        confidence: 0,
        details: [],
        overallRisk: 'LOW',
      };
    }

    const coverage = this.expectedOutputCoverage(response, expectedOutput);

    if (coverage < 0.3) {
      const missing = this.extractKeyTokens(expectedOutput)
        .filter((token) => !response.toLowerCase().includes(token.toLowerCase()))
        .slice(0, 3)
        .map((token) => `"${token}"`);

      return {
        detected: true,
        confidence: 0.8,
        details: [
          {
            claim: response.slice(0, 160) || '(empty response)',
            type: 'UNSUPPORTED_CLAIM',
            confidence: 0.8,
            explanation: missing.length
              ? `Response omits key expected content: ${missing.join(', ')}`
              : 'Response does not meaningfully cover the expected output.',
          },
        ],
        overallRisk: 'HIGH',
      };
    }

    if (coverage < 0.6) {
      return {
        detected: true,
        confidence: 0.4,
        details: [
          {
            claim: response.slice(0, 160),
            type: 'FABRICATION',
            confidence: 0.4,
            explanation: 'Response only partially covers the expected output; some claims may be unsupported.',
          },
        ],
        overallRisk: 'MEDIUM',
      };
    }

    return {
      detected: false,
      confidence: 0.2,
      details: [],
      overallRisk: 'LOW',
    };
  }

  // ── Heuristic feedback intelligence (fail open) ─────────────────────────

  private readonly LABEL_PATTERNS: Array<{ label: string; confidence: number; patterns: RegExp[] }> = [
    {
      label: 'hallucination',
      confidence: 0.9,
      patterns: [/hallucinat/i, /fabricat/i, /made up/i, /not real/i],
    },
    {
      label: 'factual error',
      confidence: 0.85,
      patterns: [/factually/i, /factual error/i, /incorrect/i, /wrong info/i, /not accurate/i, /mistake/i],
    },
    {
      label: 'unsupported claim',
      confidence: 0.8,
      patterns: [/unsupported/i, /no evidence/i, /not supported/i, /unsubstantiated/i],
    },
    {
      label: 'safety concern',
      confidence: 0.85,
      patterns: [/unsafe/i, /harmful/i, /offensive/i, /inappropriate/i, /dangerous/i, /slur/i, /abusive/i],
    },
    {
      label: 'incomplete',
      confidence: 0.8,
      patterns: [/incomplete/i, /missing/i, /truncated/i, /didn'?t answer/i, /unfinished/i, /half.?baked/i],
    },
    {
      label: 'unclear',
      confidence: 0.8,
      patterns: [/unclear/i, /confusing/i, /ambiguous/i, /vague/i, /hard to follow/i, /doesn'?t make sense/i],
    },
    {
      label: 'off-topic',
      confidence: 0.8,
      patterns: [/off.?topic/i, /irrelevant/i, /doesn'?t address/i, /not related/i, /rambl/i],
    },
    {
      label: 'verbose',
      confidence: 0.75,
      patterns: [/verbose/i, /wordy/i, /too long/i, /rambling/i, /repetitive/i, /bloated/i],
    },
    {
      label: 'concise',
      confidence: 0.7,
      patterns: [/concise/i, /brief/i, /succinct/i, /to the point/i, /short and clear/i],
    },
    {
      label: 'good response',
      confidence: 0.6,
      patterns: [/good/i, /great/i, /excellent/i, /helpful/i, /well done/i, /accurate and clear/i, /perfect/i],
    },
  ];

  private readonly THEME_PATTERNS: Array<{ theme: string; patterns: RegExp[] }> = [
    { theme: 'accuracy and factual errors', patterns: [/accura/i, /factual/i, /fact/i, /hallucinat/i, /incorrect/i] },
    { theme: 'clarity and readability', patterns: [/clear/i, /unclear/i, /confusing/i, /ambiguous/i, /readable/i, /follow/i] },
    { theme: 'completeness of answers', patterns: [/complete/i, /incomplete/i, /missing/i, /thorough/i, /depth/i] },
    { theme: 'conciseness', patterns: [/concise/i, /verbose/i, /wordy/i, /length/i, /too long/i, /brief/i] },
    { theme: 'tone and politeness', patterns: [/tone/i, /polite/i, /rude/i, /professional/i, /friendly/i, /empathetic/i] },
    { theme: 'safety and guardrails', patterns: [/safe/i, /unsafe/i, /harmful/i, /offensive/i, /guardrail/i, /policy/i] },
    { theme: 'helpfulness', patterns: [/helpful/i, /useful/i, /actionable/i, /practical/i, /solved/i, /answered/i] },
  ];

  private autoLabelHeuristically(comment: string): AutoLabelSuggestion {
    const matches: Array<{ label: string; confidence: number }> = [];
    for (const entry of this.LABEL_PATTERNS) {
      if (entry.patterns.some((pattern) => pattern.test(comment))) {
        matches.push({ label: entry.label, confidence: entry.confidence });
      }
    }

    if (matches.length === 0) {
      return {
        suggestedLabel: 'needs review',
        confidence: 0.3,
        reasoning: 'No known quality signal matched the comment keywords.',
        alternativeLabels: [],
      };
    }

    matches.sort((a, b) => b.confidence - a.confidence);
    return {
      suggestedLabel: matches[0].label,
      confidence: matches[0].confidence,
      reasoning: `Matched "${matches[0].label}" against keyword patterns in the comment.`,
      alternativeLabels: matches.slice(1, 4),
    };
  }

  private summarizeFeedbackHeuristically(
    evaluations: Array<{
      comment?: string | null;
      overallScore?: number | null;
      scores?: Record<string, number> | null;
    }>,
  ): FeedbackSummary {
    const scoresByDimension: Record<string, number[]> = {};
    let totalScore = 0;
    let scored = 0;

    for (const evaluation of evaluations) {
      if (evaluation.overallScore != null) {
        totalScore += evaluation.overallScore;
        scored += 1;
      }
      const scores = evaluation.scores ?? {};
      for (const [dimension, value] of Object.entries(scores)) {
        (scoresByDimension[dimension] ??= []).push(value);
      }
    }

    const themeCounts = new Map<string, number>();
    for (const evaluation of evaluations) {
      const comment = evaluation.comment ?? '';
      for (const entry of this.THEME_PATTERNS) {
        if (entry.patterns.some((pattern) => pattern.test(comment))) {
          themeCounts.set(entry.theme, (themeCounts.get(entry.theme) ?? 0) + 1);
        }
      }
    }

    const strengthAreas: string[] = [];
    const weaknessAreas: string[] = [];
    for (const [dimension, values] of Object.entries(scoresByDimension)) {
      const avg = values.reduce((a, b) => a + b, 0) / values.length;
      if (avg >= 7.5) strengthAreas.push(dimension);
      else if (avg <= 5) weaknessAreas.push(dimension);
    }

    const average = scored > 0 ? totalScore / scored : 0;
    const overallSentiment: FeedbackSummary['overallSentiment'] =
      scored === 0
        ? 'NEUTRAL'
        : average >= 7
          ? 'POSITIVE'
          : average >= 5
            ? 'NEUTRAL'
            : 'NEGATIVE';

    const commonThemes = [...themeCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4)
      .map(([theme]) => theme);

    const suggestedImprovements = [
      ...(weaknessAreas.length ? [`Improve performance on: ${weaknessAreas.join(', ')}`] : []),
      ...(commonThemes.length ? [`Address recurring theme: ${commonThemes[0]}`] : []),
      ...(scored === 0 ? ['Collect more scored evaluations before drawing conclusions.'] : []),
    ];

    return {
      totalEvaluations: evaluations.length,
      commonThemes,
      strengthAreas,
      weaknessAreas,
      suggestedImprovements,
      overallSentiment,
      summary:
        `Analyzed ${evaluations.length} evaluation(s) with an average score of ${average.toFixed(1)}/10. ` +
        (commonThemes.length ? `Common themes: ${commonThemes.join(', ')}.` : 'No clear themes detected.'),
    };
  }
}
