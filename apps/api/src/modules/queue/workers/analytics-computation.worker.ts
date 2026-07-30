import { Processor, Process, OnQueueFailed } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { QueueName, AnalyticsComputationJobData } from '@scorra/types';

@Processor(QueueName.ANALYTICS_COMPUTATION)
export class AnalyticsComputationWorker {
  private readonly logger = new Logger(AnalyticsComputationWorker.name);

  @Process('compute-analytics')
  async handleAnalyticsComputation(job: Job<AnalyticsComputationJobData>) {
    this.logger.log(
      `Analytics computation stub: ${job.data.computationType} for org ${job.data.organizationId}`,
    );
    // TODO: Phase 4.4 — compute agreement metrics, score trends, evaluator metrics
    return { success: true, message: 'Analytics computation not yet implemented' };
  }

  @OnQueueFailed()
  onFailed(job: Job, error: Error) {
    this.logger.error(`Analytics job ${job.id} failed: ${error.message}`, error.stack);
  }
}
