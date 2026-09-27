import { Controller, Get } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { Public } from '../../common/decorators/public.decorator';
import { PrismaService } from '../../prisma/prisma.service';
import { QueueName } from '@scorra/types';

@Controller({ path: 'health', version: '1' })
export class HealthController {
  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue(QueueName.DATASET_PROCESSING) private readonly datasetQueue: Queue,
  ) {}

  @Public()
  @Get()
  async check() {
    await this.prisma.$queryRaw`SELECT 1`;

    // Reported (not enforced) so a queue outage is visible from the outside:
    // when Redis is unreachable, uploads cannot be queued and datasets would
    // otherwise sit at PROCESSING with no explanation. A degraded queue must
    // not fail the health check, or the platform would restart the service
    // instead of letting the API answer requests it can still serve.
    const redis = this.redisStatus();

    return {
      status: 'ok',
      database: 'up',
      redis,
      timestamp: new Date().toISOString(),
    };
  }

  /** Bull keeps a single lazily-connected ioredis client for the queue. */
  private redisStatus(): string {
    try {
      const client = this.datasetQueue?.client as { status?: string } | undefined;
      return client?.status ?? 'unknown';
    } catch {
      return 'unknown';
    }
  }
}
