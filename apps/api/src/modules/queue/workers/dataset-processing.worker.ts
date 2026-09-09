import { Processor, Process, OnQueueFailed, OnQueueCompleted } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { QueueName, DatasetProcessingJobData } from '@scorra/types';
import { DatasetProcessorService } from '../../datasets/dataset-processor.service';

@Processor(QueueName.DATASET_PROCESSING)
export class DatasetProcessingWorker {
  private readonly logger = new Logger(DatasetProcessingWorker.name);

  constructor(private readonly processorService: DatasetProcessorService) {}

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
  onFailed(job: Job, error: Error) {
    this.logger.error(
      `Dataset job ${job.id} failed (attempt ${job.attemptsMade}): ${error.message}`,
      error.stack,
    );
  }
}
