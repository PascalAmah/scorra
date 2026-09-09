import { Processor, Process, OnQueueFailed } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { QueueName, ExportGenerationJobData } from '@scorra/types';
import { ExportGenerationService } from '../../exports/export-generation.service';

@Processor(QueueName.EXPORT_GENERATION)
export class ExportGenerationWorker {
  private readonly logger = new Logger(ExportGenerationWorker.name);

  constructor(private readonly exportGenerationService: ExportGenerationService) {}

  @Process('generate-export')
  async handleExportGeneration(job: Job<ExportGenerationJobData>) {
    this.logger.log(
      `Generating export ${job.data.exportId} (task ${job.data.taskId})`,
    );
    return this.exportGenerationService.generateExport(job.data);
  }

  @OnQueueFailed()
  onFailed(job: Job, error: Error) {
    this.logger.error(`Export job ${job.id} failed: ${error.message}`, error.stack);
  }
}