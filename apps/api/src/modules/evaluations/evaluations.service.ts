import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../../prisma/prisma.service';
import { SubmitEvaluationDto } from './dto/submit-evaluation.dto';
import { PaginationDto, buildPaginationMeta } from '../../common/dto/pagination.dto';
import { QueueName, AIEvaluationJobData } from '@scorra/types';
import { Prisma } from '@prisma/client';

@Injectable()
export class EvaluationsService {
  private readonly logger = new Logger(EvaluationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
    @InjectQueue(QueueName.AI_EVALUATION)
    private readonly aiEvalQueue: Queue,
  ) {}

  /**
   * Get the next unevaluated item for an evaluator in a task.
   */
  async getNextItem(taskId: string, evaluatorId: string, organizationId: string) {
    const task = await this.prisma.evaluationTask.findFirst({
      where: { id: taskId, organizationId },
      include: { dataset: true },
    });

    if (!task) throw new NotFoundException('Task not found');
    if (task.status !== 'ACTIVE') throw new ForbiddenException('Task is not active');

    // Find a row not yet evaluated by this evaluator
    const evaluated = await this.prisma.evaluation.findMany({
      where: { taskId, evaluatorId },
      select: { datasetRowId: true },
    });

    const evaluatedIds = evaluated.map((e) => e.datasetRowId);

    const nextRow = await this.prisma.datasetRow.findFirst({
      where: {
        datasetId: task.datasetId,
        id: { notIn: evaluatedIds },
      },
      orderBy: { rowIndex: 'asc' },
      include: {
        modelResponses: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!nextRow) {
      return { completed: true, message: 'All items evaluated' };
    }

    // Create a pending evaluation record
    const evaluation = await this.prisma.evaluation.upsert({
      where: {
        taskId_datasetRowId_evaluatorId: {
          taskId,
          datasetRowId: nextRow.id,
          evaluatorId,
        },
      },
      create: {
        taskId,
        datasetRowId: nextRow.id,
        evaluatorId,
        status: 'IN_PROGRESS',
      },
      update: { status: 'IN_PROGRESS' },
    });

    return {
      completed: false,
      evaluation,
      datasetRow: nextRow,
      task: {
        id: task.id,
        name: task.name,
        type: task.type,
        scoringCriteria: task.scoringCriteria,
      },
    };
  }

  async submit(evaluatorId: string, dto: SubmitEvaluationDto) {
    const existing = await this.prisma.evaluation.findFirst({
      where: {
        taskId: dto.taskId,
        datasetRowId: dto.datasetRowId,
        evaluatorId,
      },
    });

    if (existing?.status === 'COMPLETED') {
      throw new ConflictException('This item has already been evaluated');
    }

    const evaluation = await this.prisma.evaluation.upsert({
      where: {
        taskId_datasetRowId_evaluatorId: {
          taskId: dto.taskId,
          datasetRowId: dto.datasetRowId,
          evaluatorId,
        },
      },
      create: {
        taskId: dto.taskId,
        datasetRowId: dto.datasetRowId,
        evaluatorId,
        status: 'COMPLETED',
        scores: dto.scores as unknown as Prisma.InputJsonValue,
        overallScore: dto.overallScore,
        comment: dto.comment,
        tags: dto.tags ?? [],
        timeSpentSeconds: dto.timeSpentSeconds,
        submittedAt: new Date(),
      },
      update: {
        status: 'COMPLETED',
        scores: dto.scores as unknown as Prisma.InputJsonValue,
        overallScore: dto.overallScore,
        comment: dto.comment,
        tags: dto.tags ?? [],
        timeSpentSeconds: dto.timeSpentSeconds,
        submittedAt: new Date(),
      },
    });

    this.eventEmitter.emit('evaluation.submitted', {
      evaluationId: evaluation.id,
      taskId: dto.taskId,
      evaluatorId,
    });

    this.logger.log(`Evaluation submitted: ${evaluation.id} by ${evaluatorId}`);
    return evaluation;
  }

  async requestAISuggestions(evaluationId: string, evaluatorId: string) {
    const evaluation = await this.prisma.evaluation.findFirst({
      where: { id: evaluationId, evaluatorId },
      include: {
        datasetRow: { include: { modelResponses: true } },
        task: true,
      },
    });

    if (!evaluation) throw new NotFoundException('Evaluation not found');

    const firstResponse = evaluation.datasetRow.modelResponses[0];
    if (!firstResponse) {
      throw new NotFoundException('No model response found for this evaluation item');
    }

    const jobData: AIEvaluationJobData = {
      evaluationId,
      datasetRowId: evaluation.datasetRowId,
      modelResponse: firstResponse.response,
      prompt: evaluation.datasetRow.prompt,
      context: evaluation.datasetRow.context,
      expectedOutput: evaluation.datasetRow.expectedOutput,
      scoringCriteria: [],
      organizationId: evaluation.task.organizationId,
    };

    await this.aiEvalQueue.add('ai-evaluate', jobData, {
      priority: 1,
      attempts: 2,
    });

    return { message: 'AI suggestions requested', evaluationId };
  }

  async findByTask(taskId: string, organizationId: string, query: PaginationDto) {
    // Verify task belongs to org
    const task = await this.prisma.evaluationTask.findFirst({
      where: { id: taskId, organizationId },
    });
    if (!task) throw new NotFoundException('Task not found');

    const where: Prisma.EvaluationWhereInput = { taskId };

    const [evaluations, total] = await Promise.all([
      this.prisma.evaluation.findMany({
        where,
        skip: query.skip,
        take: query.limit,
        orderBy: { createdAt: 'desc' },
        include: {
          evaluator: { select: { id: true, name: true, email: true } },
          datasetRow: { select: { id: true, rowIndex: true, prompt: true } },
        },
      }),
      this.prisma.evaluation.count({ where }),
    ]);

    return {
      data: evaluations,
      pagination: buildPaginationMeta(total, query.page ?? 1, query.limit ?? 20),
    };
  }

  async findByEvaluator(evaluatorId: string, query: PaginationDto) {
    const where: Prisma.EvaluationWhereInput = { evaluatorId };

    const [evaluations, total] = await Promise.all([
      this.prisma.evaluation.findMany({
        where,
        skip: query.skip,
        take: query.limit,
        orderBy: { updatedAt: 'desc' },
        include: {
          task: { select: { id: true, name: true, type: true } },
          datasetRow: { select: { id: true, rowIndex: true, prompt: true } },
        },
      }),
      this.prisma.evaluation.count({ where }),
    ]);

    return {
      data: evaluations,
      pagination: buildPaginationMeta(total, query.page ?? 1, query.limit ?? 20),
    };
  }
}
