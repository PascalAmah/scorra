import { Processor, Process, OnQueueFailed } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { QueueName, ExportGenerationJobData } from '@scorra/types';

@Processor(QueueName.EXPORT_GENERATION)
export class ExportGenerationWorker {
  private readonly logger = new Logger(ExportGenerationWorker.name);

  @Process('generate-export')
  async handleExportGeneration(job: Job<ExportGenerationJobData>) {
    this.logger.log(
      `Export generation stub for export ${job.data.exportId} (task ${job.data.taskId})`,
    );
    // TODO: Phase 4.5 — query evaluations, serialize to requested format, upload to storage
    return { success: true, message: 'Export generation not yet implemented' };
  }

  @OnQueueFailed()
  onFailed(job: Job, error: Error) {
    this.logger.error(`Export job ${job.id} failed: ${error.message}`, error.stack);
  }
}
