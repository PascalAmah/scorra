import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { EvaluationsController } from './evaluations.controller';
import { EvaluationsService } from './evaluations.service';
import { EvaluationTasksService } from './evaluation-tasks.service';
import { AiModule } from '../ai/ai.module';
import { QueueName } from '@scorra/types';

@Module({
  imports: [
    BullModule.registerQueue(
      { name: QueueName.AI_EVALUATION },
      { name: QueueName.MODEL_INFERENCE },
    ),
    AiModule,
  ],
  controllers: [EvaluationsController],
  providers: [EvaluationsService, EvaluationTasksService],
  exports: [EvaluationsService, EvaluationTasksService],
})
export class EvaluationsModule {}
