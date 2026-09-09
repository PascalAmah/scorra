import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { ExportsController } from './exports.controller';
import { ExportsService } from './exports.service';
import { ExportGenerationService } from './export-generation.service';
import { StorageService } from '../../common/services/storage.service';
import { QueueName } from '@scorra/types';

@Module({
  imports: [BullModule.registerQueue({ name: QueueName.EXPORT_GENERATION })],
  controllers: [ExportsController],
  providers: [ExportsService, ExportGenerationService, StorageService],
  exports: [ExportsService, ExportGenerationService],
})
export class ExportsModule {}
