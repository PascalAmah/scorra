import { Test, TestingModule } from '@nestjs/testing';
import { ComparisonsService } from './comparisons.service';
import { PrismaService } from '../../prisma/prisma.service';
import { NotFoundException, ForbiddenException } from '@nestjs/common';

describe('ComparisonsService', () => {
  let service: ComparisonsService;
  let prisma: any;

  const userId = 'user-1';
  const taskId = 'task-1';

  beforeEach(async () => {
    prisma = {
      evaluationTask: { findUnique: jest.fn() },
      pairwiseComparison: { findMany: jest.fn(), findFirst: jest.fn(), create: jest.fn() },
      rankingResult: { findMany: jest.fn(), findFirst: jest.fn(), create: jest.fn() },
      rankingEntry: { createMany: jest.fn() },
      datasetRow: { findFirst: jest.fn() },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [ComparisonsService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = module.get<ComparisonsService>(ComparisonsService);
  });

  describe('getNextPair', () => {
    it('should return next uncompared pair', async () => {
      prisma.evaluationTask.findUnique.mockResolvedValue({
        id: taskId, type: 'PAIRWISE', datasetId: 'ds-1',
        assignments: [{ evaluatorId: userId }],
      });
      prisma.pairwiseComparison.findMany.mockResolvedValue([]);
      prisma.datasetRow.findFirst.mockResolvedValue({
        id: 'row-1', prompt: 'Test prompt', context: null,
        modelResponses: [
          { id: 'r1', modelName: 'GPT-4', response: 'A' },
          { id: 'r2', modelName: 'Claude', response: 'B' },
        ],
      });

      const result = await service.getNextPair(taskId, userId);
      expect(result.done).toBe(false);
      expect(result.responseA.modelName).toBe('GPT-4');
    });

    it('should return done when no more rows', async () => {
      prisma.evaluationTask.findUnique.mockResolvedValue({
        id: taskId, type: 'PAIRWISE', datasetId: 'ds-1',
        assignments: [{ evaluatorId: userId }],
      });
      prisma.pairwiseComparison.findMany.mockResolvedValue([]);
      prisma.datasetRow.findFirst.mockResolvedValue(null);

      const result = await service.getNextPair(taskId, userId);
      expect(result.done).toBe(true);
    });

    it('should throw for non-pairwise task', async () => {
      prisma.evaluationTask.findUnique.mockResolvedValue({ id: taskId, type: 'SINGLE', assignments: [] });
      await expect(service.getNextPair(taskId, userId)).rejects.toThrow(ForbiddenException);
    });
  });

  describe('submit', () => {
    it('should create a comparison', async () => {
      prisma.evaluationTask.findUnique.mockResolvedValue({ id: taskId });
      prisma.pairwiseComparison.findFirst.mockResolvedValue(null);
      prisma.pairwiseComparison.create.mockResolvedValue({ id: 'c-1', verdict: 'A_BETTER' });

      const result = await service.submit({
        taskId, datasetRowId: 'row-1', responseAId: 'r1', responseBId: 'r2',
        verdict: 'A_BETTER',
      }, userId);
      expect(result.verdict).toBe('A_BETTER');
    });

    it('should throw on duplicate submission', async () => {
      prisma.evaluationTask.findUnique.mockResolvedValue({ id: taskId });
      prisma.pairwiseComparison.findFirst.mockResolvedValue({ id: 'existing' });
      await expect(service.submit({
        taskId, datasetRowId: 'row-1', responseAId: 'r1', responseBId: 'r2',
        verdict: 'A_BETTER',
      }, userId)).rejects.toThrow(ForbiddenException);
    });
  });
});
