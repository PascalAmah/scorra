import { Processor, Process, OnQueueFailed, OnQueueCompleted } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { QueueName, DatasetProcessingJobData } from '@scorra/types';
import { DatasetProcessorService } from '../../datasets/dataset-processor.service';
import { PrismaService } from '../../../prisma/prisma.service';

@Processor(QueueName.DATASET_PROCESSING)
export class DatasetProcessingWorker {
  private readonly logger = new Logger(DatasetProcessingWorker.name);

  constructor(
    private readonly processorService: DatasetProcessorService,
    private readonly prisma: PrismaService,
  ) {}

  @Process('process-dataset')
  async handleDatasetProcessing(job: Job<DatasetProcessingJobData>) {
    this.logger.log(`Processing dataset job ${job.id}: dataset ${job.data.datasetId}`);

    const result = await this.processorService.processDataset(job.data);

    await job.progress(100);
    return result;
  }

  @OnQueueCompleted()
  onCompleted(job: Job, result: unknown) {
    this.logger.log(`Dataset job ${job.id} completed: ${JSON.stringify(result)}`);
  }

  @OnQueueFailed()
  async onFailed(job: Job<DatasetProcessingJobData>, error: Error) {
    this.logger.error(
      `Dataset job ${job.id} failed (attempt ${job.attemptsMade}): ${error.message}`,
      error.stack,
    );

    // The processor marks the dataset FAILED on its way out, but it can die
    // before that catch runs (OOM, container restart). Only act once Bull has
    // exhausted its retries, and only if nothing else moved the status on —
    // otherwise a dataset would look failed while a retry is still pending.
    const maxAttempts = job.opts?.attempts ?? 1;
    if (job.attemptsMade < maxAttempts) return;

    const datasetId = job.data?.datasetId;
    if (!datasetId) return;

    try {
      await this.prisma.dataset.updateMany({
        where: { id: datasetId, status: 'PROCESSING' },
        data: { status: 'FAILED' },
      });
    } catch (err) {
      this.logger.warn(
        `Could not mark dataset ${datasetId} FAILED: ${err instanceof Error ? err.message : err}`,
      );
    }
  }
}
