import { Test, TestingModule } from '@nestjs/testing';
import { getQueueToken } from '@nestjs/bull';
import { QueueName } from '@scorra/types';
import { DatasetProcessingReaper } from './dataset-processing-reaper.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('DatasetProcessingReaper', () => {
  let reaper: DatasetProcessingReaper;
  let prisma: { dataset: { findMany: jest.Mock; update: jest.Mock } };
  let queue: { add: jest.Mock; getJobs: jest.Mock };

  const stuckDataset = {
    id: 'ds-1',
    organizationId: 'org-1',
    fileUrl: 'datasets/ds-1/v1/file.csv',
    format: 'CSV',
    createdById: 'user-1',
    updatedAt: new Date(Date.now() - 60 * 60 * 1000),
  };

  beforeEach(async () => {
    prisma = {
      dataset: { findMany: jest.fn(), update: jest.fn().mockResolvedValue({}) },
    };
    queue = {
      add: jest.fn().mockResolvedValue({ id: 'job-1' }),
      getJobs: jest.fn().mockResolvedValue([]),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DatasetProcessingReaper,
        { provide: PrismaService, useValue: prisma },
        { provide: getQueueToken(QueueName.DATASET_PROCESSING), useValue: queue },
      ],
    }).compile();

    reaper = module.get<DatasetProcessingReaper>(DatasetProcessingReaper);
  });

  it('re-queues a dataset stuck at PROCESSING with no live job', async () => {
    prisma.dataset.findMany.mockResolvedValue([stuckDataset]);

    await reaper.reap();

    expect(queue.add).toHaveBeenCalledWith(
      'process-dataset',
      expect.objectContaining({ datasetId: 'ds-1', fileUrl: stuckDataset.fileUrl }),
      expect.any(Object),
    );
    // Touch updatedAt so the next pass leaves the fresh job alone.
    expect(prisma.dataset.update).toHaveBeenCalledWith({
      where: { id: 'ds-1' },
      data: { status: 'PROCESSING' },
    });
  });

  it('leaves a dataset alone while its job is still waiting or active', async () => {
    prisma.dataset.findMany.mockResolvedValue([stuckDataset]);
    queue.getJobs.mockResolvedValue([{ data: { datasetId: 'ds-1' } }]);

    await reaper.reap();

    expect(queue.add).not.toHaveBeenCalled();
    expect(prisma.dataset.update).not.toHaveBeenCalled();
  });

  it('marks the dataset FAILED when it cannot be re-queued', async () => {
    prisma.dataset.findMany.mockResolvedValue([stuckDataset]);
    queue.add.mockRejectedValue(new Error('ECONNREFUSED'));

    await reaper.reap();

    expect(prisma.dataset.update).toHaveBeenCalledWith({
      where: { id: 'ds-1' },
      data: { status: 'FAILED' },
    });
  });

  it('marks the dataset FAILED when there is no stored file to reprocess', async () => {
    prisma.dataset.findMany.mockResolvedValue([{ ...stuckDataset, fileUrl: null }]);

    await reaper.reap();

    expect(queue.add).not.toHaveBeenCalled();
    expect(prisma.dataset.update).toHaveBeenCalledWith({
      where: { id: 'ds-1' },
      data: { status: 'FAILED' },
    });
  });

  it('does nothing when no dataset is stuck', async () => {
    prisma.dataset.findMany.mockResolvedValue([]);

    await reaper.reap();

    expect(queue.getJobs).not.toHaveBeenCalled();
    expect(queue.add).not.toHaveBeenCalled();
  });

  it('swallows errors so the cron loop keeps running', async () => {
    prisma.dataset.findMany.mockRejectedValue(new Error('database down'));

    await expect(reaper.reap()).resolves.toBeUndefined();
  });
});
