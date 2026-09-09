import { Injectable, NotFoundException, ForbiddenException, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateEvaluationTaskDto } from './dto/create-evaluation-task.dto';
import { UpdateEvaluationTaskDto } from './dto/update-evaluation-task.dto';
import { PaginationDto, buildPaginationMeta } from '../../common/dto/pagination.dto';
import { Prisma } from '@prisma/client';
import { AuthTokenPayload, UserRole } from '@scorra/types';

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

  async pause(taskId: string, organizationId: string) {
    const task = await this.findOneOrThrow(taskId, organizationId);

    if (task.status !== 'ACTIVE') {
      throw new ForbiddenException('Only ACTIVE tasks can be paused');
    }

    const updated = await this.prisma.evaluationTask.update({
      where: { id: taskId },
      data: { status: 'PAUSED' },
    });

    this.logger.log(`Task paused: ${taskId}`);
    return updated;
  }

  async update(taskId: string, organizationId: string, dto: UpdateEvaluationTaskDto) {
    await this.findOneOrThrow(taskId, organizationId);

    const data: Prisma.EvaluationTaskUpdateInput = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.description !== undefined) data.description = dto.description;
    if (dto.dueDate !== undefined) data.dueDate = dto.dueDate ? new Date(dto.dueDate) : null;

    const updated = await this.prisma.evaluationTask.update({
      where: { id: taskId },
      data,
      include: {
        dataset: { select: { id: true, name: true, rowCount: true } },
        createdBy: { select: { id: true, name: true } },
      },
    });

    this.logger.log(`Task updated: ${taskId}`);
    return updated;
  }

  async findAll(organizationId: string, query: PaginationDto, user?: AuthTokenPayload) {
    const isAdmin = user ? this.isOrgAdmin(user) : true;
    const where: Prisma.EvaluationTaskWhereInput = {
      organizationId,
      ...(!isAdmin && user ? { assignments: { some: { evaluatorId: user.sub } } } : {}),
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
          assignments: { select: { evaluatorId: true } },
          _count: {
            select: { evaluations: true, assignments: true, comparisons: true },
          },
        },
      }),
      this.prisma.evaluationTask.count({ where }),
    ]);

    const taskIds = tasks.map((t) => t.id);

    // Org-wide progress: number of DISTINCT dataset rows that have a COMPLETED
    // evaluation (or comparison / ranking for PAIRWISE / RANKING tasks).
    // Matches getProgress().
    const completedRows: Map<string, number> = new Map();
    // Per-user completed counts — COMPLETED status only, so merely opening an
    // item (which upserts an IN_PROGRESS row) never counts as progress.
    // RANKING results have no status column — any submitted ranking counts.
    const myCounts: Map<string, { evaluations: number; comparisons: number; rankings: number }> =
      new Map();

    if (taskIds.length > 0) {
      const [completedEvals, completedComps, completedRankings] = await Promise.all([
        this.prisma.evaluation.findMany({
          where: { taskId: { in: taskIds }, status: 'COMPLETED' },
          select: { taskId: true, datasetRowId: true },
        }),
        this.prisma.pairwiseComparison.findMany({
          where: { taskId: { in: taskIds }, status: 'COMPLETED' },
          select: { taskId: true, datasetRowId: true },
        }),
        this.prisma.rankingResult.findMany({
          where: { taskId: { in: taskIds } },
          select: { taskId: true, datasetRowId: true },
        }),
      ]);

      const evalRows: Map<string, Set<string>> = new Map();
      for (const e of completedEvals) {
        const set = evalRows.get(e.taskId) ?? new Set();
        set.add(e.datasetRowId);
        evalRows.set(e.taskId, set);
      }
      const comparisonRows: Map<string, Set<string>> = new Map();
      for (const c of completedComps) {
        const set = comparisonRows.get(c.taskId) ?? new Set();
        set.add(c.datasetRowId);
        comparisonRows.set(c.taskId, set);
      }
      const rankingRows: Map<string, Set<string>> = new Map();
      for (const r of completedRankings) {
        const set = rankingRows.get(r.taskId) ?? new Set();
        set.add(r.datasetRowId);
        rankingRows.set(r.taskId, set);
      }

      for (const t of tasks) {
        const set =
          t.type === 'PAIRWISE'
            ? comparisonRows.get(t.id)
            : t.type === 'RANKING'
              ? rankingRows.get(t.id)
              : evalRows.get(t.id);
        completedRows.set(t.id, set?.size ?? 0);
      }

      if (user) {
        const [myEvals, myComps, myRankings] = await Promise.all([
          this.prisma.evaluation.groupBy({
            by: ['taskId'],
            where: { taskId: { in: taskIds }, evaluatorId: user.sub, status: 'COMPLETED' },
            _count: true,
          }),
          this.prisma.pairwiseComparison.groupBy({
            by: ['taskId'],
            where: { taskId: { in: taskIds }, evaluatorId: user.sub, status: 'COMPLETED' },
            _count: true,
          }),
          this.prisma.rankingResult.groupBy({
            by: ['taskId'],
            where: { taskId: { in: taskIds }, evaluatorId: user.sub },
            _count: true,
          }),
        ]);
        for (const e of myEvals) {
          myCounts.set(e.taskId, { evaluations: e._count, comparisons: 0, rankings: 0 });
        }
        for (const c of myComps) {
          const existing = myCounts.get(c.taskId);
          myCounts.set(c.taskId, {
            evaluations: existing?.evaluations ?? 0,
            comparisons: c._count,
            rankings: existing?.rankings ?? 0,
          });
        }
        for (const r of myRankings) {
          const existing = myCounts.get(r.taskId);
          myCounts.set(r.taskId, {
            evaluations: existing?.evaluations ?? 0,
            comparisons: existing?.comparisons ?? 0,
            rankings: r._count,
          });
        }
      }
    }

    const data = tasks.map((t) => ({
      ...t,
      completedRows: completedRows.get(t.id) ?? 0,
      assignedEvaluatorIds: (t.assignments ?? []).map((a) => a.evaluatorId),
      myCounts: user
        ? (myCounts.get(t.id) ?? { evaluations: 0, comparisons: 0, rankings: 0 })
        : undefined,
    }));

    return {
      data,
      pagination: buildPaginationMeta(total, query.page ?? 1, query.limit ?? 20),
    };
  }

  async findOne(taskId: string, organizationId: string) {
    return this.findOneOrThrow(taskId, organizationId);
  }

  async getProgress(taskId: string, organizationId: string, userId: string) {
    const task = await this.findOneOrThrow(taskId, organizationId);

    const [totalRows, completedEvaluations, pendingEvaluations, assignments, myCompleted] =
      await Promise.all([
        this.prisma.datasetRow.count({ where: { datasetId: task.datasetId } }),
        this.countCompletedRows(task),
        this.countPendingRows(task),
        this.prisma.taskAssignment.count({ where: { taskId } }),
        this.countEvaluatorCompleted(task, userId),
      ]);

    // RANKING results have no PENDING status — a row is pending until a
    // rankingResult exists for it.
    const effectivePending =
      task.type === 'RANKING'
        ? Math.max(0, totalRows - completedEvaluations)
        : pendingEvaluations;

    const completionRate = totalRows > 0 ? (completedEvaluations / totalRows) * 100 : 0;

    return {
      taskId,
      totalRows,
      completedEvaluations,
      pendingEvaluations: effectivePending,
      assignments,
      myCompleted,
      completionRate: Math.round(completionRate * 100) / 100,
    };
  }

  /** Number of DISTINCT dataset rows with a completed item, per task type. */
  private async countCompletedRows(task: { id: string; type: string }): Promise<number> {
    switch (task.type) {
      case 'PAIRWISE':
        return this.prisma.pairwiseComparison
          .findMany({
            where: { taskId: task.id, status: 'COMPLETED' },
            select: { datasetRowId: true },
            distinct: ['datasetRowId'],
          })
          .then((rows) => rows.length);
      case 'RANKING':
        return this.prisma.rankingResult
          .findMany({
            where: { taskId: task.id },
            select: { datasetRowId: true },
            distinct: ['datasetRowId'],
          })
          .then((rows) => rows.length);
      default:
        return this.prisma.evaluation
          .findMany({
            where: { taskId: task.id, status: 'COMPLETED' },
            select: { datasetRowId: true },
            distinct: ['datasetRowId'],
          })
          .then((rows) => rows.length);
    }
  }

  /** Number of DISTINCT dataset rows with a PENDING item, per task type. */
  private async countPendingRows(task: { id: string; type: string }): Promise<number> {
    switch (task.type) {
      case 'PAIRWISE':
        return this.prisma.pairwiseComparison
          .findMany({
            where: { taskId: task.id, status: 'PENDING' },
            select: { datasetRowId: true },
            distinct: ['datasetRowId'],
          })
          .then((rows) => rows.length);
      case 'RANKING':
        // No PENDING rows exist — computed as totalRows - completed by the caller.
        return 0;
      default:
        return this.prisma.evaluation
          .findMany({
            where: { taskId: task.id, status: 'PENDING' },
            select: { datasetRowId: true },
            distinct: ['datasetRowId'],
          })
          .then((rows) => rows.length);
    }
  }

  /** Count completed items for a single evaluator, scoped to the task's workflow type. */
  private async countEvaluatorCompleted(
    task: { id: string; type: string },
    userId: string,
  ): Promise<number> {
    switch (task.type) {
      case 'PAIRWISE':
        return this.prisma.pairwiseComparison.count({
          where: { taskId: task.id, evaluatorId: userId, status: 'COMPLETED' },
        });
      case 'RANKING':
        return this.prisma.rankingResult.count({
          where: { taskId: task.id, evaluatorId: userId },
        });
      default:
        return this.prisma.evaluation.count({
          where: { taskId: task.id, evaluatorId: userId, status: 'COMPLETED' },
        });
    }
  }

  /** Org admins (and super admins) see every task in the org; evaluators only theirs. */
  private isOrgAdmin(user: AuthTokenPayload): boolean {
    return (
      user.role === UserRole.ORG_ADMIN ||
      user.role === UserRole.SUPER_ADMIN ||
      user.organizationRole === UserRole.ORG_ADMIN
    );
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
