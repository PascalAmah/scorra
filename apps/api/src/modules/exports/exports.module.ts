import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { ExportsController } from './exports.controller';
import { ExportsService } from './exports.service';
import { QueueName } from '@scorra/types';

@Module({
  imports: [BullModule.registerQueue({ name: QueueName.EXPORT_GENERATION })],
  controllers: [ExportsController],
  providers: [ExportsService],
  exports: [ExportsService],
})
export class ExportsModule {}
