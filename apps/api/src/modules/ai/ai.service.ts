import { Injectable, Logger } from '@nestjs/common';
import { AIEvaluationResult } from '@scorra/types';

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);

  /**
   * Evaluate an AI model response against given criteria.
   * TODO: Phase 2 — wire up real OpenAI/Anthropic calls with structured output.
   */
  async evaluateResponse(params: {
    prompt: string;
    response: string;
    context?: string;
    expectedOutput?: string;
    criteria: string[];
  }): Promise<AIEvaluationResult> {
    this.logger.log('AI evaluation requested (stub — returning placeholder)');

    return {
      scores: {},
      overallScore: 0,
      reasoning: 'AI evaluation not yet implemented. See Phase 2 of BUILD_PLAN.md.',
      hallucinationDetection: {
        detected: false,
        confidence: 0,
        details: [],
        overallRisk: 'LOW',
      },
      qualityLabel: 'FAIR',
      confidence: 0,
      tokensUsed: 0,
      latencyMs: 0,
    };
  }
}
