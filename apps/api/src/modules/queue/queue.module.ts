import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { QueueName } from '@scorra/types';
import { DatasetProcessingWorker } from './workers/dataset-processing.worker';
import { AIEvaluationWorker } from './workers/ai-evaluation.worker';
import { ModelInferenceWorker } from './workers/model-inference.worker';
import { ExportGenerationWorker } from './workers/export-generation.worker';
import { AnalyticsComputationWorker } from './workers/analytics-computation.worker';
import { EmailNotificationsWorker } from './workers/email-notifications.worker';
import { DatasetProcessorService } from '../datasets/dataset-processor.service';
import { ExportGenerationService } from '../exports/export-generation.service';
import { StorageService } from '../../common/services/storage.service';
import { EmailModule } from '../../common/services/email';
import { AiModule } from '../ai/ai.module';
import { AnalyticsModule } from '../analytics/analytics.module';

@Module({
  imports: [
    AiModule,
    AnalyticsModule,
    EmailModule,
    BullModule.registerQueue(
      { name: QueueName.DATASET_PROCESSING },
      { name: QueueName.AI_EVALUATION },
      { name: QueueName.EXPORT_GENERATION },
      { name: QueueName.ANALYTICS_COMPUTATION },
      { name: QueueName.MODEL_INFERENCE },
      { name: QueueName.EMAIL_NOTIFICATIONS },
    ),
  ],
  providers: [
    DatasetProcessingWorker,
    AIEvaluationWorker,
    ModelInferenceWorker,
    ExportGenerationWorker,
    AnalyticsComputationWorker,
    EmailNotificationsWorker,
    DatasetProcessorService,
    StorageService,
    ExportGenerationService,
  ],
  exports: [EmailModule],
})
export class QueueModule {}
