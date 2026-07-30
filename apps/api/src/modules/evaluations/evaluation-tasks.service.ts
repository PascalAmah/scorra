import { Injectable, NotFoundException, ForbiddenException, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateEvaluationTaskDto } from './dto/create-evaluation-task.dto';
import { PaginationDto, buildPaginationMeta } from '../../common/dto/pagination.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class EvaluationTasksService {
  private readonly logger = new Logger(EvaluationTasksService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async create(organizationId: string, userId: string, dto: CreateEvaluationTaskDto) {
    const task = await this.prisma.evaluationTask.create({
      data: {
        organizationId,
        datasetId: dto.datasetId,
        name: dto.name,
        description: dto.description,
        type: dto.type ?? 'SINGLE',
        scoringCriteria: (dto.scoringCriteria ?? []) as unknown as Prisma.InputJsonValue,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
        createdById: userId,
        status: 'DRAFT',
      },
      include: {
        dataset: { select: { id: true, name: true, rowCount: true } },
        createdBy: { select: { id: true, name: true } },
      },
    });

    // Assign evaluators if provided
    if (dto.evaluatorIds?.length) {
      await this.prisma.taskAssignment.createMany({
        data: dto.evaluatorIds.map((evaluatorId) => ({
          taskId: task.id,
          evaluatorId,
        })),
        skipDuplicates: true,
      });
    }

    this.eventEmitter.emit('task.created', { taskId: task.id, organizationId });
    this.logger.log(`Evaluation task created: ${task.id}`);

    return task;
  }

  async activate(taskId: string, organizationId: string) {
    const task = await this.findOneOrThrow(taskId, organizationId);

    if (task.status !== 'DRAFT' && task.status !== 'PAUSED') {
      throw new ForbiddenException('Only DRAFT or PAUSED tasks can be activated');
    }

    const updated = await this.prisma.evaluationTask.update({
      where: { id: taskId },
      data: { status: 'ACTIVE' },
    });

    this.eventEmitter.emit('task.activated', { taskId, organizationId });
    return updated;
  }

  async findAll(organizationId: string, query: PaginationDto) {
    const where: Prisma.EvaluationTaskWhereInput = {
      organizationId,
      ...(query.search && {
        OR: [
          { name: { contains: query.search, mode: 'insensitive' } },
          { description: { contains: query.search, mode: 'insensitive' } },
        ],
      }),
    };

    const [tasks, total] = await Promise.all([
      this.prisma.evaluationTask.findMany({
        where,
        skip: query.skip,
        take: query.limit,
        orderBy: { createdAt: 'desc' },
        include: {
          dataset: { select: { id: true, name: true, rowCount: true } },
          createdBy: { select: { id: true, name: true } },
          _count: {
            select: { evaluations: true, assignments: true, comparisons: true },
          },
        },
      }),
      this.prisma.evaluationTask.count({ where }),
    ]);

    return {
      data: tasks,
      pagination: buildPaginationMeta(total, query.page ?? 1, query.limit ?? 20),
    };
  }

  async findOne(taskId: string, organizationId: string) {
    return this.findOneOrThrow(taskId, organizationId);
  }

  async getProgress(taskId: string, organizationId: string) {
    const task = await this.findOneOrThrow(taskId, organizationId);

    const [totalRows, completedEvaluations, pendingEvaluations, assignments] =
      await Promise.all([
        this.prisma.datasetRow.count({ where: { datasetId: task.datasetId } }),
        this.prisma.evaluation.count({
          where: { taskId, status: 'COMPLETED' },
        }),
        this.prisma.evaluation.count({
          where: { taskId, status: 'PENDING' },
        }),
        this.prisma.taskAssignment.count({ where: { taskId } }),
      ]);

    const completionRate = totalRows > 0 ? (completedEvaluations / totalRows) * 100 : 0;

    return {
      taskId,
      totalRows,
      completedEvaluations,
      pendingEvaluations,
      assignments,
      completionRate: Math.round(completionRate * 100) / 100,
    };
  }

  private async findOneOrThrow(taskId: string, organizationId: string) {
    const task = await this.prisma.evaluationTask.findFirst({
      where: { id: taskId, organizationId },
      include: {
        dataset: { select: { id: true, name: true, rowCount: true } },
        assignments: {
          include: { task: { select: { id: true } } },
        },
      },
    });

    if (!task) {
      throw new NotFoundException(`Evaluation task ${taskId} not found`);
    }

    return task;
  }
}
