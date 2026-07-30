import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { QueueName } from '@scorra/types';
import { DatasetProcessingWorker } from './workers/dataset-processing.worker';
import { AIEvaluationWorker } from './workers/ai-evaluation.worker';
import { ExportGenerationWorker } from './workers/export-generation.worker';
import { AnalyticsComputationWorker } from './workers/analytics-computation.worker';
import { DatasetProcessorService } from '../datasets/dataset-processor.service';
import { StorageService } from '../../common/services/storage.service';
import { AiModule } from '../ai/ai.module';

@Module({
  imports: [
    AiModule,
    BullModule.registerQueue(
      { name: QueueName.DATASET_PROCESSING },
      { name: QueueName.AI_EVALUATION },
      { name: QueueName.EXPORT_GENERATION },
      { name: QueueName.ANALYTICS_COMPUTATION },
      { name: QueueName.MODEL_INFERENCE },
    ),
  ],
  providers: [
    DatasetProcessingWorker,
    AIEvaluationWorker,
    ExportGenerationWorker,
    AnalyticsComputationWorker,
    DatasetProcessorService,
    StorageService,
  ],
  exports: [],
})
export class QueueModule {}
