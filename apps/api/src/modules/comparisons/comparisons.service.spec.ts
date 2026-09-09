import { Test, TestingModule } from '@nestjs/testing';
import { ComparisonsService } from './comparisons.service';
import { PrismaService } from '../../prisma/prisma.service';
import { ForbiddenException } from '@nestjs/common';
import { ComparisonVerdict } from '@scorra/types';

describe('ComparisonsService', () => {
  let service: ComparisonsService;
  let prisma: any;

  const userId = 'user-1';
  const taskId = 'task-1';
  const orgId = 'org-1';

  beforeEach(async () => {
    prisma = {
      evaluationTask: { findFirst: jest.fn(), findUnique: jest.fn() },
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
      prisma.evaluationTask.findFirst.mockResolvedValue({
        id: taskId,
        type: 'PAIRWISE',
        datasetId: 'ds-1',
        status: 'ACTIVE',
        organizationId: orgId,
        assignments: [{ evaluatorId: userId }],
      });
      prisma.pairwiseComparison.findMany.mockResolvedValue([]);
      prisma.datasetRow.findFirst.mockResolvedValue({
        id: 'row-1',
        prompt: 'Test prompt',
        context: null,
        modelResponses: [
          { id: 'r1', modelName: 'GPT-4', response: 'A' },
          { id: 'r2', modelName: 'Claude', response: 'B' },
        ],
      });

      const result = await service.getNextPair(taskId, userId, orgId);
      if (result.done) throw new Error('Expected an uncompared pair');
      expect(result.done).toBe(false);
      expect(result.responseA.modelName).toBe('GPT-4');
    });

    it('should return done when no more rows', async () => {
      prisma.evaluationTask.findFirst.mockResolvedValue({
        id: taskId,
        type: 'PAIRWISE',
        datasetId: 'ds-1',
        status: 'ACTIVE',
        organizationId: orgId,
        assignments: [{ evaluatorId: userId }],
      });
      prisma.pairwiseComparison.findMany.mockResolvedValue([]);
      prisma.datasetRow.findFirst.mockResolvedValue(null);

      const result = await service.getNextPair(taskId, userId, orgId);
      expect(result.done).toBe(true);
    });

    it('should throw for non-pairwise task', async () => {
      prisma.evaluationTask.findFirst.mockResolvedValue({
        id: taskId,
        type: 'SINGLE',
        status: 'ACTIVE',
        organizationId: orgId,
        assignments: [],
      });
      await expect(service.getNextPair(taskId, userId, orgId)).rejects.toThrow(ForbiddenException);
    });

    it('should throw when the evaluator is not assigned', async () => {
      prisma.evaluationTask.findFirst.mockResolvedValue({
        id: taskId,
        type: 'PAIRWISE',
        datasetId: 'ds-1',
        status: 'ACTIVE',
        organizationId: orgId,
        assignments: [{ evaluatorId: 'someone-else' }],
      });
      await expect(service.getNextPair(taskId, userId, orgId)).rejects.toThrow(ForbiddenException);
    });
  });

  describe('submit', () => {
    it('should create a comparison', async () => {
      prisma.evaluationTask.findFirst.mockResolvedValue({
        id: taskId,
        status: 'ACTIVE',
        organizationId: orgId,
        assignments: [{ evaluatorId: userId }],
      });
      prisma.pairwiseComparison.findFirst.mockResolvedValue(null);
      prisma.pairwiseComparison.create.mockResolvedValue({ id: 'c-1', verdict: 'A_BETTER' });

      const result = await service.submit(
        {
          taskId,
          datasetRowId: 'row-1',
          responseAId: 'r1',
          responseBId: 'r2',
          verdict: ComparisonVerdict.A_BETTER,
        },
        userId,
        orgId,
      );
      expect(result.verdict).toBe(ComparisonVerdict.A_BETTER);
    });

    it('should throw on duplicate submission', async () => {
      prisma.evaluationTask.findFirst.mockResolvedValue({
        id: taskId,
        status: 'ACTIVE',
        organizationId: orgId,
        assignments: [{ evaluatorId: userId }],
      });
      prisma.pairwiseComparison.findFirst.mockResolvedValue({ id: 'existing' });
      await expect(
        service.submit(
          {
            taskId,
            datasetRowId: 'row-1',
            responseAId: 'r1',
            responseBId: 'r2',
            verdict: ComparisonVerdict.A_BETTER,
          },
          userId,
          orgId,
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw when the evaluator is not assigned', async () => {
      prisma.evaluationTask.findFirst.mockResolvedValue({
        id: taskId,
        status: 'ACTIVE',
        organizationId: orgId,
        assignments: [{ evaluatorId: 'someone-else' }],
      });
      await expect(
        service.submit(
          {
            taskId,
            datasetRowId: 'row-1',
            responseAId: 'r1',
            responseBId: 'r2',
            verdict: ComparisonVerdict.A_BETTER,
          },
          userId,
          orgId,
        ),
      ).rejects.toThrow(ForbiddenException);
    });
  });
});
