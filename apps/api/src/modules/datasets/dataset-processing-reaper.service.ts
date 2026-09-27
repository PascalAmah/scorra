import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { DatasetProcessingJobData, QueueName } from '@scorra/types';
import { PrismaService } from '../../prisma/prisma.service';
import { withTimeout } from '../../common/utils/promise.util';

/** How long a dataset may sit at PROCESSING before it counts as stuck. */
const STUCK_AFTER_MS = 30 * 60 * 1000;
const REAP_BATCH_SIZE = 25;
const QUEUE_TIMEOUT_MS = 10_000;

/**
 * Datasets are set to PROCESSING before the job is queued, so anything that
 * loses the job (Redis down mid-upload, a container killed before the job was
 * persisted, a worker crash) used to leave the dataset at PROCESSING forever —
 * the UI polled for a status change that could never arrive.
 *
 * This reaper closes that hole: every 10 minutes it looks for datasets that
 * have been PROCESSING for longer than STUCK_AFTER_MS *and* have no live job
 * in Redis, then re-queues them. A long-running import still has an active job,
 * so it is left alone.
 */
@Injectable()
export class DatasetProcessingReaper {
  private readonly logger = new Logger(DatasetProcessingReaper.name);

  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue(QueueName.DATASET_PROCESSING)
    private readonly datasetQueue: Queue,
  ) {}

  @Cron(CronExpression.EVERY_10_MINUTES)
  async reap(): Promise<void> {
    try {
      const stuck = await this.prisma.dataset.findMany({
        where: {
          status: 'PROCESSING',
          updatedAt: { lt: new Date(Date.now() - STUCK_AFTER_MS) },
        },
        select: {
          id: true,
          organizationId: true,
          fileUrl: true,
          format: true,
          createdById: true,
          updatedAt: true,
        },
        take: REAP_BATCH_SIZE,
      });

      if (stuck.length === 0) return;

      const live = await this.liveDatasetIds();

      for (const dataset of stuck) {
        // Still waiting/active in Redis — the worker just hasn't finished.
        if (live.has(dataset.id)) continue;

        if (!dataset.fileUrl) {
          await this.markFailed(dataset.id, 'no stored file to reprocess');
          continue;
        }

        const data: DatasetProcessingJobData = {
          datasetId: dataset.id,
          organizationId: dataset.organizationId,
          fileUrl: dataset.fileUrl,
          format: dataset.format,
          uploadedById: dataset.createdById,
        };

        try {
          await withTimeout(
            this.datasetQueue.add('process-dataset', data, {
              attempts: 3,
              backoff: { type: 'exponential', delay: 3000 },
            }),
            QUEUE_TIMEOUT_MS,
            'job queue unavailable',
          );

          // Touch updatedAt so the next pass doesn't pick this row up again
          // while the fresh job is still running.
          await this.prisma.dataset.update({
            where: { id: dataset.id },
            data: { status: 'PROCESSING' },
          });

          this.logger.warn(
            `Re-queued dataset ${dataset.id}: stuck at PROCESSING since ${dataset.updatedAt.toISOString()}`,
          );
        } catch (err) {
          await this.markFailed(dataset.id, err instanceof Error ? err.message : String(err));
        }
      }
    } catch (err) {
      // Never let a reaper failure take down the cron loop.
      this.logger.error(`Dataset reaper pass failed: ${err instanceof Error ? err.message : err}`);
    }
  }

  /** Dataset ids holding a waiting/active/delayed job in the queue. */
  private async liveDatasetIds(): Promise<Set<string>> {
    const ids = new Set<string>();

    try {
      // `getJobs` also talks to Redis, so it must be bounded too — an
      // unreachable broker would otherwise leave this cron pass pending.
      const jobs = await withTimeout(
        this.datasetQueue.getJobs(['active', 'waiting', 'delayed'], 0, 1000, false),
        QUEUE_TIMEOUT_MS,
        'job queue unavailable',
      );
      for (const job of jobs) {
        const datasetId = (job?.data as Partial<DatasetProcessingJobData> | undefined)?.datasetId;
        if (typeof datasetId === 'string') ids.add(datasetId);
      }
    } catch (err) {
      this.logger.warn(
        `Could not read live jobs (assuming none): ${err instanceof Error ? err.message : err}`,
      );
    }

    return ids;
  }

  private async markFailed(datasetId: string, reason: string): Promise<void> {
    this.logger.error(`Dataset ${datasetId} could not be reprocessed (${reason}) — marking FAILED`);
    await this.prisma.dataset
      .update({ where: { id: datasetId }, data: { status: 'FAILED' } })
      .catch(() => undefined);
  }
}
