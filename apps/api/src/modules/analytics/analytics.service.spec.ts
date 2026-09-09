import { Test, TestingModule } from '@nestjs/testing';
import { getQueueToken } from '@nestjs/bull';
import { NotFoundException } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { PrismaService } from '../../prisma/prisma.service';
import { QueueName } from '@scorra/types';

const analyticsQueue = { add: jest.fn() };

function prismaMock() {
  return {
    evaluationTask: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
    evaluation: {
      findMany: jest.fn(),
      count: jest.fn(),
    },
    dataset: {
      count: jest.fn(),
      findMany: jest.fn(),
    },
    modelResponse: {
      count: jest.fn(),
    },
    export: {
      findMany: jest.fn(),
    },
  };
}

describe('AnalyticsService', () => {
  let service: AnalyticsService;
  let prisma: ReturnType<typeof prismaMock>;

  const orgId = 'org-1';
  const taskId = 'task-1';

  beforeEach(async () => {
    jest.clearAllMocks();
    prisma = prismaMock();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AnalyticsService,
        { provide: PrismaService, useValue: prisma },
        { provide: getQueueToken(QueueName.ANALYTICS_COMPUTATION), useValue: analyticsQueue },
      ],
    }).compile();

    service = module.get<AnalyticsService>(AnalyticsService);
  });

  describe('getTaskAgreement', () => {
    const completed = (overallScore: number, datasetRowId: string, evaluatorId: string) => ({
      datasetRowId,
      evaluatorId,
      overallScore,
      scores: [],
    });

    it('throws NotFoundException for a task outside the org', async () => {
      prisma.evaluationTask.findFirst.mockResolvedValue(null);
      await expect(service.getTaskAgreement(taskId, orgId)).rejects.toThrow(NotFoundException);
    });

    it('computes agreement rate, Fleiss kappa and pairwise Cohen kappa', async () => {
      prisma.evaluationTask.findFirst.mockResolvedValue({ id: taskId });
      prisma.evaluation.findMany.mockResolvedValue([
        completed(9, 'row-1', 'alice'),
        completed(3, 'row-1', 'bob'),
        completed(8, 'row-2', 'alice'),
        completed(8, 'row-2', 'bob'),
        completed(7, 'row-3', 'alice'),
        completed(7, 'row-3', 'carol'),
        completed(5, 'row-4', 'bob'),
        completed(5, 'row-4', 'carol'),
      ]);

      const result = await service.getTaskAgreement(taskId, orgId);

      expect(result.overallAgreementRate).toBe(0.75);
      expect(result.fleissKappa).toBeCloseTo(0.467, 3);
      expect(result.pairwiseAgreements).toHaveLength(3);

      const aliceBob = result.pairwiseAgreements.find(
        (pair) => pair.evaluatorAId === 'alice' && pair.evaluatorBId === 'bob',
      );
      expect(aliceBob?.agreementRate).toBe(0.5);
      expect(aliceBob?.cohensKappa).toBe(0);

      const aliceCarol = result.pairwiseAgreements.find(
        (pair) => pair.evaluatorAId === 'alice' && pair.evaluatorBId === 'carol',
      );
      expect(aliceCarol?.agreementRate).toBe(1);
      expect(aliceCarol?.cohensKappa).toBeNull();
    });

    it('returns zero agreement when no rows are co-rated', async () => {
      prisma.evaluationTask.findFirst.mockResolvedValue({ id: taskId });
      prisma.evaluation.findMany.mockResolvedValue([
        completed(9, 'row-1', 'alice'),
        completed(3, 'row-2', 'bob'),
      ]);

      const result = await service.getTaskAgreement(taskId, orgId);
      expect(result.overallAgreementRate).toBe(0);
      expect(result.fleissKappa).toBeNull();
      expect(result.pairwiseAgreements).toEqual([]);
    });

    it('caches the result across calls', async () => {
      prisma.evaluationTask.findFirst.mockResolvedValue({ id: taskId });
      prisma.evaluation.findMany.mockResolvedValue([
        completed(8, 'row-1', 'alice'),
        completed(8, 'row-1', 'bob'),
      ]);

      await service.getTaskAgreement(taskId, orgId);
      await service.getTaskAgreement(taskId, orgId);

      expect(prisma.evaluation.findMany).toHaveBeenCalledTimes(1);
    });
  });

  describe('getTaskScores', () => {
    it('computes distribution, dimensions and summary stats', async () => {
      prisma.evaluationTask.findFirst.mockResolvedValue({ id: taskId });
      prisma.evaluation.findMany.mockResolvedValue([
        { overallScore: 9, scores: [{ label: 'Accuracy', score: 10 }, { label: 'Safety', score: 8 }] },
        { overallScore: 6.5, scores: [{ label: 'Accuracy', score: 7 }] },
        { overallScore: 4, scores: [{ label: 'Safety', score: 4 }] },
      ]);

      const result = await service.getTaskScores(taskId, orgId);

      expect(result.totalEvaluations).toBe(3);
      expect(result.averageScore).toBe(6.5);
      expect(result.medianScore).toBe(6.5);
      expect(result.minScore).toBe(4);
      expect(result.maxScore).toBe(9);

      const bucket = result.distribution.find((b) => b.bucket === '6-7');
      expect(bucket?.count).toBe(1);
      expect(result.distribution.reduce((sum, b) => sum + b.count, 0)).toBe(3);

      const accuracy = result.dimensions.find((d) => d.label === 'Accuracy');
      expect(accuracy).toMatchObject({ averageScore: 8.5, minScore: 7, maxScore: 10, count: 2 });

      expect(result.qualityLabelBreakdown).toEqual([
        { label: 'EXCELLENT', count: 1 },
        { label: 'GOOD', count: 1 },
        { label: 'FAIR', count: 0 },
        { label: 'POOR', count: 1 },
      ]);
    });
  });

  describe('getEvaluatorMetrics', () => {
    it('computes throughput, agreement, consistency and completion', async () => {
      prisma.evaluationTask.findMany.mockResolvedValue([{ id: taskId }]);
      prisma.evaluation.findMany.mockResolvedValue([
        { evaluatorId: 'alice', status: 'COMPLETED', overallScore: 8, scores: [], timeSpentSeconds: 100, datasetRowId: 'row-1', taskId, evaluator: { name: 'Alice' } },
        { evaluatorId: 'alice', status: 'COMPLETED', overallScore: 8, scores: [], timeSpentSeconds: 300, datasetRowId: 'row-2', taskId, evaluator: { name: 'Alice' } },
        { evaluatorId: 'alice', status: 'PENDING', overallScore: null, scores: [], timeSpentSeconds: null, datasetRowId: 'row-3', taskId, evaluator: { name: 'Alice' } },
        { evaluatorId: 'bob', status: 'COMPLETED', overallScore: 8, scores: [], timeSpentSeconds: null, datasetRowId: 'row-1', taskId, evaluator: { name: 'Bob' } },
        { evaluatorId: 'bob', status: 'COMPLETED', overallScore: 6, scores: [], timeSpentSeconds: null, datasetRowId: 'row-2', taskId, evaluator: { name: 'Bob' } },
      ]);

      const result = await service.getEvaluatorMetrics(orgId);

      const alice = result.find((metric) => metric.evaluatorId === 'alice');
      expect(alice).toMatchObject({
        evaluatorName: 'Alice',
        totalEvaluations: 2,
        averageTimePerEvaluation: 200,
        agreementRate: 0.5,
        consistencyScore: 1,
        averageScore: 8,
      });
      expect(alice?.completionRate).toBeCloseTo(0.667, 3);

      const bob = result.find((metric) => metric.evaluatorId === 'bob');
      expect(bob).toMatchObject({
        totalEvaluations: 2,
        completionRate: 1,
        agreementRate: 0.5,
        consistencyScore: 0.8,
        averageScore: 7,
      });
    });

    it('returns an empty list when the org has no tasks', async () => {
      prisma.evaluationTask.findMany.mockResolvedValue([]);
      const result = await service.getEvaluatorMetrics(orgId);
      expect(result).toEqual([]);
    });
  });

  describe('getDashboardSummary', () => {
    it('aggregates org-wide counters and this-month metrics', async () => {
      prisma.evaluationTask.findMany.mockResolvedValue([{ id: taskId }]);
      prisma.evaluation.count
        .mockResolvedValueOnce(3) // total
        .mockResolvedValueOnce(2) // completed
        .mockResolvedValueOnce(1); // pending
      prisma.evaluation.findMany
        .mockResolvedValueOnce([{ evaluatorId: 'alice' }, { evaluatorId: 'bob' }]) // distinct evaluators
        .mockResolvedValueOnce([
          { overallScore: 8, scores: [], aiSuggestions: { hallucinationDetected: false } },
          { overallScore: 6, scores: [], aiSuggestions: { hallucinationDetected: true } },
        ]); // month completed
      prisma.dataset.count.mockResolvedValue(2);
      prisma.modelResponse.count.mockResolvedValue(1);

      prisma.evaluation.findMany.mockResolvedValueOnce([]); // recent evaluations
      prisma.dataset.findMany.mockResolvedValue([]);
      prisma.evaluationTask.findMany.mockResolvedValueOnce([{ id: taskId }]); // recent tasks
      prisma.export.findMany.mockResolvedValue([]);

      const result = await service.getDashboardSummary(orgId);

      expect(result.totalEvaluations).toBe(3);
      expect(result.completedEvaluations).toBe(2);
      expect(result.pendingEvaluations).toBe(1);
      expect(result.activeEvaluators).toBe(2);
      expect(result.totalDatasets).toBe(2);
      expect(result.totalModels).toBe(1);
      expect(result.averageScoreThisMonth).toBe(7);
      expect(result.hallucinationRateThisMonth).toBe(0.5);
      expect(Array.isArray(result.recentActivity)).toBe(true);
    });
  });

  describe('precompute', () => {
    it('warms caches for an org and all its tasks', async () => {
      prisma.evaluationTask.findMany.mockResolvedValue([{ id: taskId }]);
      prisma.evaluationTask.findFirst.mockResolvedValue({ id: taskId });
      prisma.evaluation.findMany.mockResolvedValue([]);
      prisma.dataset.count.mockResolvedValue(0);
      prisma.modelResponse.count.mockResolvedValue(0);
      prisma.evaluation.count.mockResolvedValue(0);
      prisma.dataset.findMany.mockResolvedValue([]);
      prisma.export.findMany.mockResolvedValue([]);

      const result = await service.precompute(orgId);

      expect(result.tasksWarmed).toBe(1);
      expect(prisma.evaluationTask.findMany).toHaveBeenCalled();
    });
  });
});
