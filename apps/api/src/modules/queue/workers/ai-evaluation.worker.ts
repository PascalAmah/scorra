import { Processor, Process, OnQueueFailed } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { QueueName, AIEvaluationJobData, AISuggestion } from '@scorra/types';
import { AiService } from '../../ai/ai.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { Prisma } from '@prisma/client';

@Processor(QueueName.AI_EVALUATION)
export class AIEvaluationWorker {
  private readonly logger = new Logger(AIEvaluationWorker.name);

  constructor(
    private readonly aiService: AiService,
    private readonly prisma: PrismaService,
  ) {}

  @Process('ai-evaluate')
  async handleAIEvaluation(job: Job<AIEvaluationJobData>) {
    const { evaluationId, modelResponse, prompt, context, expectedOutput, scoringCriteria } =
      job.data;

    this.logger.log(`Running AI evaluation for ${evaluationId}`);

    const result = await this.aiService.evaluateResponse({
      prompt,
      response: modelResponse,
      context: context ?? undefined,
      expectedOutput: expectedOutput ?? undefined,
      criteria: scoringCriteria,
    });

    const suggestion: AISuggestion = {
      suggestedScores: result.scores,
      dimensionExplanations: result.dimensionExplanations,
      hallucinationDetected: result.hallucinationDetection.detected,
      hallucinationDetails: result.hallucinationDetection.details.length
        ? result.hallucinationDetection.details.map((d) => d.explanation).join(' ')
        : null,
      qualityLabel: result.qualityLabel,
      reasoning: result.reasoning,
      confidence: result.confidence,
      generatedAt: new Date(),
      tokensUsed: result.tokensUsed,
      latencyMs: result.latencyMs,
    };

    // Store AI suggestions on the evaluation
    await this.prisma.evaluation.update({
      where: { id: evaluationId },
      data: {
        aiSuggestions: suggestion as unknown as Prisma.InputJsonValue,
      },
    });

    this.logger.log(`AI evaluation complete for ${evaluationId}`);
    return result;
  }

  @OnQueueFailed()
  onFailed(job: Job, error: Error) {
    this.logger.error(
      `AI evaluation job ${job.id} failed: ${error.message}`,
      error.stack,
    );
  }
}
