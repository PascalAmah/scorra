import { Processor, Process, OnQueueFailed } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { QueueName, AnalyticsComputationJobData } from '@scorra/types';
import { AnalyticsService } from '../../analytics/analytics.service';

@Processor(QueueName.ANALYTICS_COMPUTATION)
export class AnalyticsComputationWorker {
  private readonly logger = new Logger(AnalyticsComputationWorker.name);

  constructor(private readonly analyticsService: AnalyticsService) {}

  @Process('compute-analytics')
  async handleAnalyticsComputation(job: Job<AnalyticsComputationJobData>) {
    const { organizationId, taskId, computationType } = job.data;

    this.logger.log(
      `Computing analytics (${computationType}) for org ${organizationId}${
        taskId ? ` task ${taskId}` : ''
      }`,
    );

    const result = await this.analyticsService.precompute(organizationId, taskId);
    this.logger.log(
      `Analytics computation complete for org ${organizationId}: ${result.tasksWarmed} task(s) warmed`,
    );

    return result;
  }

  @OnQueueFailed()
  onFailed(job: Job, error: Error) {
    this.logger.error(`Analytics job ${job.id} failed: ${error.message}`, error.stack);
  }
}
