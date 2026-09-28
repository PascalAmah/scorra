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
    //
    // A connection status of "ready" only means the TCP connection is up;
    // managed Redis providers (like Upstash) reject commands with an ERR
    // reply once the plan's daily/monthly quota is reached while keeping
    // the socket alive. Testing with a real PING verifies that the Redis
    // instance is actually accepting commands.
    const redis = await this.redisStatus();

    return {
      status: 'ok',
      database: 'up',
      redis,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Bull keeps a lazily-connected ioredis client on the queue. We first
   * check connection status, then verify with PING that Redis is actually
   * accepting commands (not quota-blocked or write-limited).
   */
  private async redisStatus(): Promise<string> {
    try {
      const client = this.datasetQueue?.client as
        | { status?: string; ping?: () => Promise<string> }
        | undefined;

      const connStatus = client?.status;
      if (!connStatus) {
        return 'unknown';
      }
      if (connStatus !== 'ready') {
        return connStatus;
      }

      if (typeof client.ping === 'function') {
        try {
          // Bound to 1.5s so a hung Redis doesn't stall the health check
          await Promise.race([
            client.ping(),
            new Promise((_, reject) =>
              setTimeout(() => reject(new Error('PING timed out')), 1500),
            ),
          ]);
          return 'ready';
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          return `degraded: ${msg}`;
        }
      }

      return connStatus;
    } catch {
      return 'unknown';
    }
  }
}

