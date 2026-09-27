import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { QueueName } from '@scorra/types';
import { HealthController } from './health.controller';

@Module({
  imports: [BullModule.registerQueue({ name: QueueName.DATASET_PROCESSING })],
  controllers: [HealthController],
})
export class HealthModule {}
