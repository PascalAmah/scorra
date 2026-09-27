import { Test, TestingModule } from '@nestjs/testing';
import { getQueueToken } from '@nestjs/bull';
import { QueueName } from '@scorra/types';
import { HealthController } from './health.controller';
import { PrismaService } from '../../prisma/prisma.service';

describe('HealthController', () => {
  let controller: HealthController;
  let prisma: { $queryRaw: jest.Mock };
  let queue: { client: { status: string } };

  beforeEach(async () => {
    prisma = { $queryRaw: jest.fn().mockResolvedValue([{ '?column?': 1 }]) };
    queue = { client: { status: 'ready' } };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        { provide: PrismaService, useValue: prisma },
        { provide: getQueueToken(QueueName.DATASET_PROCESSING), useValue: queue },
      ],
    }).compile();

    controller = module.get<HealthController>(HealthController);
  });

  it('reports the database and redis status', async () => {
    await expect(controller.check()).resolves.toMatchObject({
      status: 'ok',
      database: 'up',
      redis: 'ready',
    });
  });

  it('still returns ok when the queue connection is down', async () => {
    queue.client.status = 'reconnecting';

    // A degraded queue is reported, not enforced — otherwise the platform would
    // restart a service that can still serve requests.
    await expect(controller.check()).resolves.toMatchObject({ status: 'ok', redis: 'reconnecting' });
  });

  it('reports an unknown redis status rather than throwing', async () => {
    queue.client = undefined as unknown as { status: string };

    await expect(controller.check()).resolves.toMatchObject({ redis: 'unknown' });
  });
});
