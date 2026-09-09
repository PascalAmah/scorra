import { Test, TestingModule } from '@nestjs/testing';
import { getQueueToken } from '@nestjs/bull';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { EvaluationsService } from './evaluations.service';
import { PrismaService } from '../../prisma/prisma.service';
import { AiService } from '../ai/ai.service';
import { QueueName, ScoreDimension } from '@scorra/types';
import { PaginationDto } from '../../common/dto/pagination.dto';

function paging(page: number, limit: number): PaginationDto {
  return Object.assign(new PaginationDto(), { page, limit });
}

describe('EvaluationsService', () => {
  let service: EvaluationsService;
  let prisma: any;
  let eventEmitter: any;
  let aiService: any;

  const taskId = 'task-1';
  const evaluatorId = 'user-1';
  const orgId = 'org-1';
  const rowId = 'row-1';

  const task = {
    id: taskId,
    organizationId: orgId,
    datasetId: 'ds-1',
    name: 'Task 1',
    type: 'SINGLE',
    status: 'ACTIVE',
    assignments: [{ evaluatorId: evaluatorId }],
    scoringCriteria: [{ label: 'Accuracy' }, { label: 'Helpfulness' }],
  };

  const datasetRow = {
    id: rowId,
    datasetId: 'ds-1',
    rowIndex: 0,
    prompt: 'Test prompt',
    context: null,
    expectedOutput: null,
    modelResponses: [{ id: 'r1', response: 'Good response' }],
  };

  const aiEvalQueue = { add: jest.fn() };

  beforeEach(async () => {
    prisma = {
      evaluationTask: {
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      evaluation: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        upsert: jest.fn(),
        count: jest.fn(),
        update: jest.fn(),
      },
      datasetRow: {
        findFirst: jest.fn(),
        count: jest.fn(),
      },
      taskAssignment: {
        findMany: jest.fn(),
      },
    };

    eventEmitter = { emit: jest.fn() };
    aiService = { summarizeFeedback: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EvaluationsService,
        { provide: PrismaService, useValue: prisma },
        { provide: EventEmitter2, useValue: eventEmitter },
        { provide: AiService, useValue: aiService },
        { provide: getQueueToken(QueueName.AI_EVALUATION), useValue: aiEvalQueue },
      ],
    }).compile();

    service = module.get<EvaluationsService>(EvaluationsService);
  });

  describe('getNextItem', () => {
    it('should throw NotFoundException when task is not found', async () => {
      prisma.evaluationTask.findFirst.mockResolvedValue(null);
      await expect(service.getNextItem(taskId, evaluatorId, orgId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ForbiddenException when task is not active', async () => {
      prisma.evaluationTask.findFirst.mockResolvedValue({ ...task, status: 'DRAFT' });
      await expect(service.getNextItem(taskId, evaluatorId, orgId)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should return completed when no rows remain', async () => {
      prisma.evaluationTask.findFirst.mockResolvedValue(task);
      prisma.evaluation.findMany.mockResolvedValue([{ datasetRowId: rowId }]);
      prisma.evaluation.findFirst.mockResolvedValue(null);
      prisma.datasetRow.findFirst.mockResolvedValue(null);
      prisma.datasetRow.count.mockResolvedValue(1);
      prisma.evaluation.count.mockResolvedValue(1);
      prisma.taskAssignment.findMany.mockResolvedValue([{ evaluatorId }]);

      const result = await service.getNextItem(taskId, evaluatorId, orgId);
      expect(result).toEqual({ completed: true, message: 'All items evaluated' });
      expect(prisma.evaluationTask.update).toHaveBeenCalledWith({
        where: { id: taskId },
        data: { status: 'COMPLETED' },
      });
      expect(eventEmitter.emit).toHaveBeenCalledWith('task.completed', { taskId });
    });

    it('should return the next item and upsert an in-progress evaluation', async () => {
      prisma.evaluationTask.findFirst.mockResolvedValue(task);
      prisma.evaluation.findMany.mockResolvedValue([]);
      prisma.evaluation.findFirst.mockResolvedValue(null);
      prisma.datasetRow.findFirst.mockResolvedValue(datasetRow);
      prisma.evaluation.upsert.mockResolvedValue({ id: 'ev-1', status: 'IN_PROGRESS' });

      const result = await service.getNextItem(taskId, evaluatorId, orgId);
      expect(result.completed).toBe(false);
      expect(result.datasetRow).toEqual(datasetRow);
      expect(result.evaluation).toEqual({ id: 'ev-1', status: 'IN_PROGRESS' });
      expect(prisma.evaluation.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            taskId_datasetRowId_evaluatorId: { taskId, datasetRowId: rowId, evaluatorId },
          },
          create: expect.objectContaining({ status: 'IN_PROGRESS' }),
        }),
      );
    });

    it('should resume an in-progress item without querying for a new row', async () => {
      prisma.evaluationTask.findFirst.mockResolvedValue(task);
      prisma.evaluation.findMany.mockResolvedValue([]);
      prisma.evaluation.findFirst.mockResolvedValue({
        id: 'ev-1',
        status: 'IN_PROGRESS',
        datasetRow,
      });

      const result = await service.getNextItem(taskId, evaluatorId, orgId);
      expect(result.completed).toBe(false);
      expect(result.datasetRow).toEqual(datasetRow);
      expect(prisma.datasetRow.findFirst).not.toHaveBeenCalled();
      expect(prisma.evaluation.upsert).not.toHaveBeenCalled();
    });
  });

  describe('submit', () => {
    const dto = {
      taskId,
      datasetRowId: rowId,
      scores: [{ dimension: ScoreDimension.ACCURACY, label: 'Accuracy', score: 9 }],
      overallScore: 9,
      comment: 'Solid',
    };

    it('should throw NotFoundException when task does not exist', async () => {
      prisma.evaluationTask.findUnique.mockResolvedValue(null);
      await expect(service.submit(evaluatorId, dto, orgId)).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException when task is not active', async () => {
      prisma.evaluationTask.findUnique.mockResolvedValue({ ...task, status: 'DRAFT' });
      await expect(service.submit(evaluatorId, dto, orgId)).rejects.toThrow(ForbiddenException);
    });

    it('should throw NotFoundException when row does not belong to the task dataset', async () => {
      prisma.evaluationTask.findUnique.mockResolvedValue(task);
      prisma.datasetRow.findFirst.mockResolvedValue(null);
      await expect(service.submit(evaluatorId, dto, orgId)).rejects.toThrow(NotFoundException);
    });

    it('should throw ConflictException when item already completed', async () => {
      prisma.evaluationTask.findUnique.mockResolvedValue(task);
      prisma.datasetRow.findFirst.mockResolvedValue({ id: rowId });
      prisma.evaluation.findFirst.mockResolvedValue({ id: 'ev-1', status: 'COMPLETED' });

      await expect(service.submit(evaluatorId, dto, orgId)).rejects.toThrow(ConflictException);
    });

    it('should create the evaluation and emit event on success', async () => {
      prisma.evaluationTask.findUnique.mockResolvedValue(task);
      prisma.datasetRow.findFirst.mockResolvedValue({ id: rowId });
      prisma.evaluation.findFirst.mockResolvedValue(null);
      prisma.evaluation.upsert.mockResolvedValue({ id: 'ev-1', status: 'COMPLETED' });

      const result = await service.submit(evaluatorId, dto, orgId);
      expect(result.status).toBe('COMPLETED');
      expect(eventEmitter.emit).toHaveBeenCalledWith('evaluation.submitted', {
        evaluationId: 'ev-1',
        taskId,
        evaluatorId,
      });
    });
  });

  describe('findByTask', () => {
    it('should throw NotFoundException for a task outside the org', async () => {
      prisma.evaluationTask.findFirst.mockResolvedValue(null);
      await expect(service.findByTask(taskId, 'other-org', paging(1, 20))).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should return evaluations with pagination', async () => {
      prisma.evaluationTask.findFirst.mockResolvedValue(task);
      prisma.evaluation.findMany.mockResolvedValue([{ id: 'ev-1' }]);
      prisma.evaluation.count.mockResolvedValue(1);

      const result = await service.findByTask(taskId, orgId, paging(1, 20));
      expect(result.data).toHaveLength(1);
      expect(result.pagination).toMatchObject({ total: 1, page: 1, hasNext: false });
    });

    it('should return empty data for a task with no evaluations', async () => {
      prisma.evaluationTask.findFirst.mockResolvedValue(task);
      prisma.evaluation.findMany.mockResolvedValue([]);
      prisma.evaluation.count.mockResolvedValue(0);

      const result = await service.findByTask(taskId, orgId, paging(1, 20));
      expect(result.data).toEqual([]);
      expect(result.pagination.total).toBe(0);
    });
  });

  describe('findByEvaluator', () => {
    it('should return evaluations and pagination for the evaluator', async () => {
      prisma.evaluation.findMany.mockResolvedValue([{ id: 'ev-1' }]);
      prisma.evaluation.count.mockResolvedValue(1);

      const result = await service.findByEvaluator(evaluatorId, paging(1, 20));
      expect(result.data).toHaveLength(1);
      expect(result.pagination.total).toBe(1);
    });

    it('should return empty data when the evaluator has none', async () => {
      prisma.evaluation.findMany.mockResolvedValue([]);
      prisma.evaluation.count.mockResolvedValue(0);

      const result = await service.findByEvaluator(evaluatorId, paging(1, 20));
      expect(result.data).toEqual([]);
      expect(result.pagination.total).toBe(0);
    });
  });

  describe('requestAISuggestions', () => {
    const evaluationRow = {
      id: 'ev-1',
      datasetRowId: rowId,
      datasetRow: {
        prompt: 'Test prompt',
        context: 'ctx',
        expectedOutput: 'expected',
        modelResponses: [{ id: 'r1', response: 'Good response' }],
      },
      task: {
        organizationId: orgId,
        scoringCriteria: [{ label: 'Accuracy' }, { label: 'Helpfulness' }],
      },
    };

    it('should throw NotFoundException when evaluation is not found', async () => {
      prisma.evaluation.findFirst.mockResolvedValue(null);
      await expect(service.requestAISuggestions('ev-1', evaluatorId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw NotFoundException when there is no model response', async () => {
      prisma.evaluation.findFirst.mockResolvedValue({
        ...evaluationRow,
        datasetRow: { ...evaluationRow.datasetRow, modelResponses: [] },
      });
      await expect(service.requestAISuggestions('ev-1', evaluatorId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should enqueue an AI evaluation job with criteria from the task', async () => {
      prisma.evaluation.findFirst.mockResolvedValue(evaluationRow);
      aiEvalQueue.add.mockResolvedValue({ id: 'job-1' });

      const result = await service.requestAISuggestions('ev-1', evaluatorId);
      expect(result.message).toContain('AI suggestions requested');

      expect(aiEvalQueue.add).toHaveBeenCalledWith(
        'ai-evaluate',
        expect.objectContaining({
          evaluationId: 'ev-1',
          prompt: 'Test prompt',
          context: 'ctx',
          expectedOutput: 'expected',
          scoringCriteria: ['Accuracy', 'Helpfulness'],
        }),
        expect.objectContaining({ priority: 1 }),
      );
    });
  });

  describe('analyzeDisagreement', () => {
    it('should throw NotFoundException for a task outside the org', async () => {
      prisma.evaluationTask.findFirst.mockResolvedValue(null);
      await expect(service.analyzeDisagreement(taskId, 'other-org')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should flag rows with a wide score spread as disputed', async () => {
      prisma.evaluationTask.findFirst.mockResolvedValue(task);
      prisma.evaluation.findMany.mockResolvedValue([
        {
          datasetRowId: 'row-1',
          overallScore: 9,
          scores: [],
          comment: 'Great answer.',
          datasetRow: { expectedOutput: 'expected output' },
          evaluator: { name: 'Alice' },
        },
        {
          datasetRowId: 'row-1',
          overallScore: 3,
          scores: [],
          comment: 'Misses the point.',
          datasetRow: { expectedOutput: 'expected output' },
          evaluator: { name: 'Bob' },
        },
      ]);

      const result = await service.analyzeDisagreement(taskId, orgId);
      expect(result.disagreementRate).toBe(1);
      expect(result.problematicItems[0].datasetRowId).toBe('row-1');
      expect(result.problematicItems[0].disagreementScore).toBe(6);
      expect(result.problematicItems[0].evaluatorOpinions).toHaveLength(2);
      expect(result.recommendations.length).toBeGreaterThan(0);
    });

    it('should report zero disagreement when evaluators agree', async () => {
      prisma.evaluationTask.findFirst.mockResolvedValue(task);
      prisma.evaluation.findMany.mockResolvedValue([
        {
          datasetRowId: 'row-1',
          overallScore: 8,
          scores: [],
          comment: null,
          datasetRow: { expectedOutput: null },
          evaluator: { name: 'Alice' },
        },
        {
          datasetRowId: 'row-1',
          overallScore: 8,
          scores: [],
          comment: null,
          datasetRow: { expectedOutput: null },
          evaluator: { name: 'Bob' },
        },
      ]);

      const result = await service.analyzeDisagreement(taskId, orgId);
      expect(result.disagreementRate).toBe(0);
      expect(result.problematicItems[0].disagreementScore).toBe(0);
    });

    it('should derive effective score from dimension averages when overall is missing', async () => {
      prisma.evaluationTask.findFirst.mockResolvedValue(task);
      prisma.evaluation.findMany.mockResolvedValue([
        {
          datasetRowId: 'row-1',
          overallScore: null,
          scores: [{ dimension: 'ACCURACY', label: 'Accuracy', score: 10 }],
          comment: null,
          datasetRow: { expectedOutput: null },
          evaluator: { name: 'Alice' },
        },
        {
          datasetRowId: 'row-1',
          overallScore: null,
          scores: [{ dimension: 'ACCURACY', label: 'Accuracy', score: 2 }],
          comment: null,
          datasetRow: { expectedOutput: null },
          evaluator: { name: 'Bob' },
        },
      ]);

      const result = await service.analyzeDisagreement(taskId, orgId);
      expect(result.disagreementRate).toBe(1);
      expect(result.problematicItems[0].disagreementScore).toBe(8);
    });
  });

  describe('getFeedbackSummary', () => {
    it('should throw NotFoundException for a task outside the org', async () => {
      prisma.evaluationTask.findFirst.mockResolvedValue(null);
      await expect(service.getFeedbackSummary(taskId, 'other-org')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should delegate to the AI service with completed evaluations', async () => {
      prisma.evaluationTask.findFirst.mockResolvedValue(task);
      prisma.evaluation.findMany.mockResolvedValue([
        { comment: 'Solid', overallScore: 8, scores: [{ label: 'Accuracy', score: 9 }] },
      ]);
      aiService.summarizeFeedback.mockResolvedValue({
        totalEvaluations: 1,
        commonThemes: [],
        strengthAreas: ['Accuracy'],
        weaknessAreas: [],
        suggestedImprovements: [],
        overallSentiment: 'POSITIVE',
        summary: 'Good overall.',
      });

      const result = await service.getFeedbackSummary(taskId, orgId);
      expect(result.totalEvaluations).toBe(1);
      expect(aiService.summarizeFeedback).toHaveBeenCalledWith([
        expect.objectContaining({ comment: 'Solid', overallScore: 8 }),
      ]);
    });
  });
});
