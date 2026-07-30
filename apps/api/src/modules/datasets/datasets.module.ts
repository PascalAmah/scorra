import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { MulterModule } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { DatasetsController } from './datasets.controller';
import { DatasetsService } from './datasets.service';
import { DatasetProcessorService } from './dataset-processor.service';
import { StorageService } from '../../common/services/storage.service';
import { QueueName } from '@scorra/types';

@Module({
  imports: [
    BullModule.registerQueue({ name: QueueName.DATASET_PROCESSING }),
    MulterModule.register({
      storage: memoryStorage(),
      limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
    }),
  ],
  controllers: [DatasetsController],
  providers: [DatasetsService, DatasetProcessorService, StorageService],
  exports: [DatasetsService],
})
export class DatasetsModule {}
