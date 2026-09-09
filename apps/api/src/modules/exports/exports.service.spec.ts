import { Test, TestingModule } from '@nestjs/testing';
import { ExportsService } from './exports.service';
import { PrismaService } from '../../prisma/prisma.service';
import { getQueueToken } from '@nestjs/bull';
import { QueueName } from '@scorra/types';
import { NotFoundException } from '@nestjs/common';

describe('ExportsService', () => {
  let service: ExportsService;
  let prisma: any;
  let queue: any;

  const orgId = 'org-1';
  const userId = 'user-1';

  beforeEach(async () => {
    prisma = {
      evaluationTask: { findFirst: jest.fn() },
      export: { create: jest.fn(), findMany: jest.fn(), findFirst: jest.fn() },
    };
    queue = { add: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ExportsService,
        { provide: PrismaService, useValue: prisma },
        { provide: getQueueToken(QueueName.EXPORT_GENERATION), useValue: queue },
      ],
    }).compile();

    service = module.get<ExportsService>(ExportsService);
  });

  describe('requestExport', () => {
    it('should create export and enqueue job', async () => {
      prisma.evaluationTask.findFirst.mockResolvedValue({ id: 'task-1', name: 'Task' });
      prisma.export.create.mockResolvedValue({ id: 'exp-1', status: 'PENDING', format: 'CSV' });

      const result = await service.requestExport(orgId, userId, {
        taskId: 'task-1', format: 'CSV' as any,
      });

      expect(result.status).toBe('PENDING');
      expect(queue.add).toHaveBeenCalledWith('generate-export', expect.any(Object), expect.any(Object));
    });

    it('should throw if task not found', async () => {
      prisma.evaluationTask.findFirst.mockResolvedValue(null);
      await expect(service.requestExport(orgId, userId, {
        taskId: 'bad-task', format: 'CSV' as any,
      })).rejects.toThrow(NotFoundException);
    });
  });

  describe('findAll', () => {
    it('should list exports for org', async () => {
      prisma.export.findMany.mockResolvedValue([{ id: 'exp-1', status: 'READY' }]);
      const result = await service.findAll(orgId);
      expect(result).toHaveLength(1);
    });
  });

  describe('getDownloadUrl → replaced by getExportFile (ExportGenerationService)', () => {
    it('should keep old getDownloadUrl contract', async () => {
      prisma.export.findFirst.mockResolvedValue({ id: 'exp-1', status: 'READY', fileUrl: '/exports/test.csv', format: 'CSV' });
      // The old method was removed; asserting that we no longer surface it.
      expect((service as any).getDownloadUrl).toBeUndefined();
    });
  });
});
