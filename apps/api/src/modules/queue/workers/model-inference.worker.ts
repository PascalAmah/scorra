import { Processor, Process, OnQueueFailed } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { QueueName, ModelInferenceJobData, AIProvider } from '@scorra/types';
import { AiService } from '../../ai/ai.service';
import { PrismaService } from '../../../prisma/prisma.service';

// ModelResponse.provider uses the DB (Prisma) enum, which is UPPERCASE,
// while the shared @scorra/types AIProvider enum is lowercase.
function toDbProvider(provider: AIProvider): 'OPENAI' | 'ANTHROPIC' | 'GROQ' | 'GEMINI' | 'CUSTOM' {
  switch (provider) {
    case AIProvider.ANTHROPIC:
      return 'ANTHROPIC';
    case AIProvider.GROQ:
      return 'GROQ';
    case AIProvider.GEMINI:
      return 'GEMINI';
    case AIProvider.OPENAI:
      return 'OPENAI';
    default:
      return 'CUSTOM';
  }
}

/**
 * Generates a model response for every dataset row that doesn't have one yet,
 * using the configured AI provider. Runs as a background job so large datasets
 * don't block an HTTP request.
 */
@Processor(QueueName.MODEL_INFERENCE)
export class ModelInferenceWorker {
  private readonly logger = new Logger(ModelInferenceWorker.name);

  constructor(
    private readonly aiService: AiService,
    private readonly prisma: PrismaService,
  ) {}

  @Process('generate-responses')
  async handleGenerateResponses(job: Job<ModelInferenceJobData>) {
    const { datasetId, organizationId } = job.data;

    const dataset = await this.prisma.dataset.findFirst({
      where: { id: datasetId, organizationId },
    });
    if (!dataset) {
      throw new Error(`Dataset ${datasetId} not found`);
    }

    if (!this.aiService.isGenerationConfigured()) {
      throw new Error('No AI provider API key configured for response generation');
    }

    // Only rows that don't have a model response yet — re-runs top up gaps
    // without duplicating existing (e.g. manually imported) responses.
    const rows = await this.prisma.datasetRow.findMany({
      where: { datasetId, modelResponses: { none: {} } },
      select: { id: true, rowIndex: true, prompt: true, context: true },
      orderBy: { rowIndex: 'asc' },
    });

    if (rows.length === 0) {
      await this.prisma.dataset.update({
        where: { id: datasetId },
        data: { status: 'READY' },
      });
      return { generated: 0, failed: 0, total: 0, message: 'All rows already have responses' };
    }

    const generation = this.aiService.getGenerationInfo();
    this.logger.log(
      `Generating ${rows.length} responses for dataset ${datasetId} with ${generation.provider} / ${generation.modelId}`,
    );

    await this.prisma.dataset.update({
      where: { id: datasetId },
      data: { status: 'PROCESSING' },
    });

    let generated = 0;
    let failed = 0;

    for (const [index, row] of rows.entries()) {
      try {
        const response = await this.aiService.generateResponse({
          prompt: row.prompt,
          context: row.context,
        });
        if (!response) {
          failed += 1;
          this.logger.warn(`Empty response generated for row ${row.rowIndex}`);
          continue;
        }
        await this.prisma.modelResponse.create({
          data: {
            datasetRowId: row.id,
            modelId: generation.modelId,
            modelName: generation.modelName,
            provider: toDbProvider(generation.provider),
            response,
          },
        });
        generated += 1;
      } catch (error) {
        failed += 1;
        this.logger.warn(
          `Response generation failed for row ${row.rowIndex}: ${(error as Error).message}`,
        );
      }
      await job.progress(Math.round(((index + 1) / rows.length) * 100));
    }

    await this.prisma.dataset.update({
      where: { id: datasetId },
      data: { status: 'READY' },
    });

    this.logger.log(`Generated ${generated} responses for dataset ${datasetId} (${failed} failed)`);
    return { generated, failed, total: rows.length };
  }

  @OnQueueFailed()
  onFailed(job: Job, error: Error) {
    this.logger.error(`Model inference job ${job.id} failed: ${error.message}`, error.stack);
    // Never leave the dataset stuck in PROCESSING.
    if (job.data?.datasetId) {
      this.prisma.dataset
        .update({ where: { id: job.data.datasetId }, data: { status: 'READY' } })
        .catch(() => undefined);
    }
  }
}
