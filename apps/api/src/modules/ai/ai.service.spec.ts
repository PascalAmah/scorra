import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { AiService } from './ai.service';

const mockOpenAICreate = jest.fn();
const mockGroqCreate = jest.fn();
const mockGeminiGenerateContent = jest.fn();

jest.mock('openai', () => ({
  __esModule: true,
  default: jest.fn(() => ({
    chat: {
      completions: {
        create: (...args: unknown[]) => mockOpenAICreate(...args),
      },
    },
  })),
}));

jest.mock('groq-sdk', () => ({
  __esModule: true,
  default: jest.fn(() => ({
    chat: {
      completions: {
        create: (...args: unknown[]) => mockGroqCreate(...args),
      },
    },
  })),
}));

jest.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: jest.fn(() => ({
    getGenerativeModel: jest.fn(() => ({
      generateContent: (...args: unknown[]) => mockGeminiGenerateContent(...args),
    })),
  })),
}));

describe('AiService', () => {
  let service: AiService;
  let configService: any;

  const params = {
    prompt: 'What is the capital of France?',
    response: 'The capital of France is Paris.',
    expectedOutput: 'Paris',
    criteria: ['Accuracy', 'Helpfulness'],
  };

  const validResult = {
    scores: { Accuracy: 9, Helpfulness: 8 },
    overallScore: 8.5,
    reasoning: 'Accurate and helpful.',
    hallucinationDetection: {
      detected: false,
      confidence: 0.1,
      details: [],
      overallRisk: 'LOW',
    },
    qualityLabel: 'GOOD',
    confidence: 0.9,
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    configService = {
      get: jest.fn().mockImplementation((key: string, fallback?: unknown) => {
        const map: Record<string, unknown> = {
          'ai.defaultProvider': 'openai',
          'ai.openaiApiKey': undefined,
          'ai.anthropicApiKey': undefined,
          'ai.groqApiKey': undefined,
          'ai.geminiApiKey': undefined,
          'ai.evaluationModel': 'gpt-4o',
          'ai.anthropicEvaluationModel': 'claude-3-5-sonnet-20241022',
          'ai.groqEvaluationModel': 'llama-3.3-70b-versatile',
          'ai.geminiEvaluationModel': 'gemini-2.0-flash',
          'ai.maxTokens': 2048,
          'ai.temperature': 0.2,
        };
        return map[key] ?? fallback;
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [AiService, { provide: ConfigService, useValue: configService }],
    }).compile();

    service = module.get<AiService>(AiService);
  });

  describe('heuristic fallback (no provider configured)', () => {
    it('returns a deterministic result with confidence 0', async () => {
      const result = await service.evaluateResponse(params);

      expect(result.confidence).toBe(0);
      expect(result.tokensUsed).toBe(0);
      expect(result.latencyMs).toBe(0);
      expect(typeof result.overallScore).toBe('number');
      expect(result.scores).toHaveProperty('Accuracy');
      expect(result.scores).toHaveProperty('Helpfulness');
      expect(mockOpenAICreate).not.toHaveBeenCalled();
    });

    it('scores accuracy higher when the expected output is covered', async () => {
      const good = await service.evaluateResponse({
        ...params,
        response: 'The capital of France is Paris. It is located on the Seine river.',
      });
      const bad = await service.evaluateResponse({
        ...params,
        response: 'I do not know the answer to that question.',
      });

      expect(good.scores['Accuracy']).toBeGreaterThan(bad.scores['Accuracy']);
    });

    it('flags hallucinations when expected output is missing from the response', async () => {
      const result = await service.evaluateResponse({
        ...params,
        response: 'The capital of France is Berlin.',
      });

      expect(result.hallucinationDetection.detected).toBe(true);
      expect(['MEDIUM', 'HIGH', 'CRITICAL']).toContain(
        result.hallucinationDetection.overallRisk,
      );
    });

    it('does not flag hallucination when no expected output is provided', async () => {
      const result = await service.evaluateResponse({
        prompt: 'Say hello',
        response: 'Hello there!',
        criteria: ['Fluency'],
      });

      expect(result.hallucinationDetection.detected).toBe(false);
      expect(result.hallucinationDetection.overallRisk).toBe('LOW');
    });

    it('provides a dimension explanation for every scored criterion', async () => {
      const result = await service.evaluateResponse(params);

      for (const criterion of params.criteria) {
        expect(result.dimensionExplanations[criterion]).toBeTruthy();
      }
      expect(result.dimensionExplanations['Accuracy']).toMatch(/expected output/i);
    });
  });

  describe('OpenAI provider', () => {
    beforeEach(() => {
      configService.get.mockImplementation((key: string, fallback?: unknown) => {
        const map: Record<string, unknown> = {
          'ai.defaultProvider': 'openai',
          'ai.openaiApiKey': 'sk-test',
          'ai.anthropicApiKey': undefined,
          'ai.groqApiKey': undefined,
          'ai.geminiApiKey': undefined,
          'ai.evaluationModel': 'gpt-4o',
          'ai.maxTokens': 2048,
          'ai.temperature': 0.2,
        };
        return map[key] ?? fallback;
      });
    });

    it('parses and validates a valid structured response', async () => {
      mockOpenAICreate.mockResolvedValue({
        choices: [{ message: { content: JSON.stringify(validResult) } }],
        usage: { total_tokens: 123 },
      });

      const result = await service.evaluateResponse(params);

      expect(result.scores).toEqual({ Accuracy: 9, Helpfulness: 8 });
      expect(result.tokensUsed).toBe(123);
      expect(result.qualityLabel).toBe('GOOD');
      expect(result.latencyMs).toBeGreaterThanOrEqual(0);
    });

    it('fills missing dimension explanations from provider output', async () => {
      const withoutExplanations = {
        ...validResult,
        dimensionExplanations: { Accuracy: 'Explained.' },
      };
      mockOpenAICreate.mockResolvedValue({
        choices: [{ message: { content: JSON.stringify(withoutExplanations) } }],
        usage: { total_tokens: 10 },
      });

      const result = await service.evaluateResponse(params);

      expect(result.dimensionExplanations['Accuracy']).toBe('Explained.');
      expect(result.dimensionExplanations['Helpfulness']).toBeTruthy();
    });

    it('falls back to heuristics when the provider returns invalid JSON', async () => {
      mockOpenAICreate.mockResolvedValue({
        choices: [{ message: { content: 'not json at all' } }],
        usage: { total_tokens: 10 },
      });

      const result = await service.evaluateResponse(params);
      expect(result.confidence).toBe(0);
      expect(result.scores).toHaveProperty('Accuracy');
    });

    it('falls back to heuristics when validation fails', async () => {
      mockOpenAICreate.mockResolvedValue({
        choices: [
          {
            message: {
              content: JSON.stringify({
                scores: 'not-an-object',
                overallScore: 'high',
                reasoning: 42,
                hallucinationDetection: {},
                qualityLabel: 'NOT_A_LABEL',
                confidence: -1,
              }),
            },
          },
        ],
        usage: { total_tokens: 10 },
      });

      const result = await service.evaluateResponse(params);
      expect(result.confidence).toBe(0);
    });

    it('falls back to heuristics when the provider call throws', async () => {
      mockOpenAICreate.mockRejectedValue(new Error('rate limited'));

      const result = await service.evaluateResponse(params);
      expect(result.confidence).toBe(0);
      expect(result.overallScore).toBeGreaterThan(0);
    });
  });

  describe('Groq provider', () => {
    beforeEach(() => {
      configService.get.mockImplementation((key: string, fallback?: unknown) => {
        const map: Record<string, unknown> = {
          'ai.defaultProvider': 'groq',
          'ai.openaiApiKey': undefined,
          'ai.anthropicApiKey': undefined,
          'ai.groqApiKey': 'gsk-test',
          'ai.geminiApiKey': undefined,
          'ai.evaluationModel': 'gpt-4o',
          'ai.groqEvaluationModel': 'llama-3.3-70b-versatile',
          'ai.maxTokens': 2048,
          'ai.temperature': 0.2,
        };
        return map[key] ?? fallback;
      });
    });

    it('parses and validates a valid structured response', async () => {
      mockGroqCreate.mockResolvedValue({
        choices: [{ message: { content: JSON.stringify(validResult) } }],
        usage: { total_tokens: 456 },
      });

      const result = await service.evaluateResponse(params);

      expect(result.scores).toEqual({ Accuracy: 9, Helpfulness: 8 });
      expect(result.tokensUsed).toBe(456);
      expect(result.qualityLabel).toBe('GOOD');
    });

    it('falls back to heuristics when the provider call throws', async () => {
      mockGroqCreate.mockRejectedValue(new Error('rate limited'));

      const result = await service.evaluateResponse(params);
      expect(result.confidence).toBe(0);
    });
  });

  describe('Gemini provider', () => {
    beforeEach(() => {
      configService.get.mockImplementation((key: string, fallback?: unknown) => {
        const map: Record<string, unknown> = {
          'ai.defaultProvider': 'gemini',
          'ai.openaiApiKey': undefined,
          'ai.anthropicApiKey': undefined,
          'ai.groqApiKey': undefined,
          'ai.geminiApiKey': 'ai-test',
          'ai.evaluationModel': 'gpt-4o',
          'ai.geminiEvaluationModel': 'gemini-2.0-flash',
          'ai.maxTokens': 2048,
          'ai.temperature': 0.2,
        };
        return map[key] ?? fallback;
      });
    });

    it('parses and validates a valid structured response', async () => {
      mockGeminiGenerateContent.mockResolvedValue({
        response: {
          text: () => JSON.stringify(validResult),
          usageMetadata: {
            promptTokenCount: 100,
            candidatesTokenCount: 200,
          },
        },
      });

      const result = await service.evaluateResponse(params);

      expect(result.scores).toEqual({ Accuracy: 9, Helpfulness: 8 });
      expect(result.tokensUsed).toBe(300);
      expect(result.qualityLabel).toBe('GOOD');
    });

    it('falls back to heuristics when the provider call throws', async () => {
      mockGeminiGenerateContent.mockRejectedValue(new Error('quota exceeded'));

      const result = await service.evaluateResponse(params);
      expect(result.confidence).toBe(0);
    });
  });

  describe('autoLabelComment (heuristic, no provider key)', () => {
    it('labels a comment containing hallucination signals', async () => {
      const suggestion = await service.autoLabelComment(
        'The response hallucinated a statistic that is not in the source.',
      );

      expect(suggestion.suggestedLabel).toBe('hallucination');
      expect(suggestion.confidence).toBeGreaterThan(0.5);
      expect(suggestion.reasoning).toBeTruthy();
    });

    it('returns a low-confidence fallback for an uninformative comment', async () => {
      const suggestion = await service.autoLabelComment('Ok.');

      expect(suggestion.suggestedLabel).toBe('needs review');
      expect(suggestion.confidence).toBeLessThan(0.5);
    });

    it('returns alternatives alongside the primary label', async () => {
      const suggestion = await service.autoLabelComment(
        'This is incorrect and unsupported by the evidence.',
      );

      expect(suggestion.suggestedLabel).toBe('factual error');
      expect(suggestion.alternativeLabels.length).toBeGreaterThan(0);
    });
  });

  describe('summarizeFeedback (heuristic, no provider key)', () => {
    it('derives strengths, weaknesses and sentiment from scores', async () => {
      const summary = await service.summarizeFeedback([
        { comment: 'Very accurate and helpful.', overallScore: 9, scores: { Accuracy: 9, Safety: 8 } },
        { comment: 'Unclear and verbose.', overallScore: 5, scores: { Accuracy: 1, Safety: 8 } },
      ]);

      expect(summary.totalEvaluations).toBe(2);
      expect(summary.overallSentiment).toBe('POSITIVE');
      expect(summary.strengthAreas).toContain('Safety');
      expect(summary.weaknessAreas).toContain('Accuracy');
      expect(summary.commonThemes.some((theme) => theme.includes('accuracy'))).toBe(true);
    });

    it('handles empty evaluation sets', async () => {
      const summary = await service.summarizeFeedback([]);

      expect(summary.totalEvaluations).toBe(0);
      expect(summary.overallSentiment).toBe('NEUTRAL');
      expect(summary.suggestedImprovements.length).toBeGreaterThan(0);
    });
  });
});
