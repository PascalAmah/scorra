import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ScheduleModule } from '@nestjs/schedule';
import { BullModule } from '@nestjs/bull';

import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { OrganizationsModule } from './modules/organizations/organizations.module';
import { UsersModule } from './modules/users/users.module';
import { DatasetsModule } from './modules/datasets/datasets.module';
import { EvaluationsModule } from './modules/evaluations/evaluations.module';
import { ComparisonsModule } from './modules/comparisons/comparisons.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { ExportsModule } from './modules/exports/exports.module';
import { AiModule } from './modules/ai/ai.module';
import { QueueModule } from './modules/queue/queue.module';
import { HealthModule } from './modules/health/health.module';
import { parseRedisUrl } from './common/utils/redis.util';
import appConfig from './config/app.config';
import databaseConfig from './config/database.config';
import redisConfig from './config/redis.config';
import jwtConfig from './config/jwt.config';
import aiConfig from './config/ai.config';

@Module({
  imports: [
    // Config
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig, databaseConfig, redisConfig, jwtConfig, aiConfig],
      envFilePath: ['.env.local', '.env'],
    }),

    // Rate limiting
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => [
        {
          ttl: config.get<number>('THROTTLE_TTL', 60) * 1000,
          limit: config.get<number>('THROTTLE_LIMIT', 100),
        },
      ],
    }),

    // Event emitter
    EventEmitterModule.forRoot({
      wildcard: true,
      delimiter: '.',
      maxListeners: 20,
    }),

    // Cron jobs
    ScheduleModule.forRoot(),

    // BullMQ / Redis queues
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        redis: parseRedisUrl(config.get<string>('REDIS_URL', 'redis://localhost:6379')),

        // Bull talks to Redis even when every queue is idle. Per queue it runs
        // one blocking BRPOPLPUSH (`drainDelay`), one delay-set poll
        // (`guardInterval`) and one stalled-job sweep (`stalledInterval`). At
        // Bull's defaults (5s / 5s / 30s) the six queues this app registers
        // generate ~225k commands/day — instantly blowing through command-billed
        // Redis plans (e.g. Upstash's free tier of 10k/day). Once that quota is
        // exceeded, the connection reports "ready" but every command fails with
        // "ERR max daily request limit exceeded", causing uploads to fail with
        // "the job queue is unavailable".
        //
        // Stretching these intervals only throttles *idle* polling — real-time
        // job latency is unchanged because new jobs wake the blocked BRPOPLPUSH
        // immediately, and delayed jobs publish on a channel that triggers an
        // immediate check.
        //
        // Idle budget: 6 queues × (1/120s + 1/300s + 1/300s) ≈ 7.8k cmds/day,
        // which fits inside the 10k/day free-tier limit.
        settings: {
          drainDelay: 120, // seconds a worker blocks on the wait list (default 5)
          guardInterval: 300_000, // ms between idle delay-set polls (default 5_000)
          stalledInterval: 300_000, // ms between stalled-job sweeps (default 30_000)
        },

        defaultJobOptions: {
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 2000,
          },
          removeOnComplete: 100,
          removeOnFail: 50,
        },
      }),
    }),

    // Core
    PrismaModule,

    // Feature modules
    AuthModule,
    OrganizationsModule,
    UsersModule,
    DatasetsModule,
    EvaluationsModule,
    ComparisonsModule,
    AnalyticsModule,
    ExportsModule,
    AiModule,
    QueueModule,
    HealthModule,
  ],
})
export class AppModule {}
