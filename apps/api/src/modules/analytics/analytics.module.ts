import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { CacheModule } from '@nestjs/cache-manager';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsService } from './analytics.service';
import { QueueName } from '@scorra/types';

import KeyvRedis = require('@keyv/redis');

@Module({
  imports: [
    BullModule.registerQueue({ name: QueueName.ANALYTICS_COMPUTATION }),
    CacheModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        stores: [
          new KeyvRedis(config.get<string>('REDIS_URL', 'redis://localhost:6379')),
        ],
        ttl: 60_000, // 60 s default TTL in milliseconds
      }),
    }),
  ],
  controllers: [AnalyticsController],
  providers: [AnalyticsService],
  exports: [AnalyticsService],
})
export class AnalyticsModule {}
