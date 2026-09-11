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
import { TaskResultsQueryDto } from './dto/task-results-query.dto';
import { PaginationDto, buildPaginationMeta } from '../../common/dto/pagination.dto';
import {
  QueueName,
  AIEvaluationJobData,
  EvaluatorDisagreementAnalysis,
  FeedbackSummary,
} from '@scorra/types';
import { AiService } from '../ai/ai.service';
import { Prisma, EvaluationStatus as PrismaEvaluationStatus } from '@prisma/client';
import { assertEvaluatorAssigned } from '../../common/utils/task-access';

@Injectable()
export class EvaluationsService {
  private readonly logger = new Logger(EvaluationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
    private readonly aiService: AiService,
    @InjectQueue(QueueName.AI_EVALUATION)
    private readonly aiEvalQueue: Queue,
  ) {}

  /**
   * Get the next unevaluated item for an evaluator in a task.
   *
   * Rows already in a final state (COMPLETED / SKIPPED) for this evaluator are
   * skipped. An in-progress evaluation is resumed first so users never lose
   * their place. When no rows remain, the task is marked COMPLETED (if the last
   * assigned evaluator has finished) and `{ completed: true }` is returned.
   */
  async getNextItem(taskId: string, evaluatorId: string, organizationId: string) {
    const task = await this.prisma.evaluationTask.findFirst({
      where: { id: taskId, organizationId },
      include: {
        dataset: true,
        assignments: { select: { evaluatorId: true } },
      },
    });

    if (!task) throw new NotFoundException('Task not found');
    if (task.status !== 'ACTIVE') throw new ForbiddenException('Task is not active');
    assertEvaluatorAssigned(task, evaluatorId);

    const FINAL_STATES: PrismaEvaluationStatus[] = [
      PrismaEvaluationStatus.COMPLETED,
      PrismaEvaluationStatus.SKIPPED,
    ];

    const evaluated = await this.prisma.evaluation.findMany({
      where: {
        taskId,
        evaluatorId,
        status: { in: FINAL_STATES },
      },
      select: { datasetRowId: true },
    });
    const evaluatedIds = evaluated.map((e) => e.datasetRowId);

    // Resume an in-progress item first
    const inProgress = await this.prisma.evaluation.findFirst({
      where: { taskId, evaluatorId, status: 'IN_PROGRESS' },
      include: {
        datasetRow: {
          include: { modelResponses: { orderBy: { createdAt: 'asc' } } },
        },
      },
    });

    let nextRow = inProgress?.datasetRow ?? null;

    if (!nextRow) {
      nextRow = await this.prisma.datasetRow.findFirst({
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
    }

    if (!nextRow) {
      // Nothing left for this evaluator — try to complete the task when all
      // assigned evaluators have finished.
      await this.maybeCompleteTask(task, evaluatedIds);
      return { completed: true, message: 'All items evaluated' };
    }

    const evaluation = inProgress
      ? inProgress
      : await this.prisma.evaluation.upsert({
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

  private async maybeCompleteTask(
    task: { id: string; type: string; datasetId: string; status: string },
    finishedRowIds: string[],
  ) {
    const totalRows = await this.prisma.datasetRow.count({
      where: { datasetId: task.datasetId },
    });
    if (finishedRowIds.length < totalRows) return;

    const assignments = await this.prisma.taskAssignment.findMany({
      where: { taskId: task.id },
      select: { evaluatorId: true },
    });

    let allDone = true;
    for (const assignment of assignments) {
      const count = await this.prisma.evaluation.count({
        where: {
          taskId: task.id,
          evaluatorId: assignment.evaluatorId,
          status: { in: ['COMPLETED', 'SKIPPED'] },
        },
      });
      if (count < totalRows) {
        allDone = false;
        break;
      }
    }

    if (allDone) {
      await this.prisma.evaluationTask.update({
        where: { id: task.id },
        data: { status: 'COMPLETED' },
      });
      this.eventEmitter.emit('task.completed', { taskId: task.id });
      this.logger.log(`Evaluation task auto-completed: ${task.id}`);
    }
  }

  async submit(evaluatorId: string, dto: SubmitEvaluationDto, organizationId: string) {
    const task = await this.prisma.evaluationTask.findUnique({
      where: { id: dto.taskId },
      include: { assignments: { select: { evaluatorId: true } } },
    });
    if (!task || task.organizationId !== organizationId) {
      throw new NotFoundException('Task not found');
    }
    if (task.status !== 'ACTIVE') throw new ForbiddenException('Task is not active');
    assertEvaluatorAssigned(task, evaluatorId);

    // The dataset row must belong to the task's dataset
    const datasetRow = await this.prisma.datasetRow.findFirst({
      where: { id: dto.datasetRowId, datasetId: task.datasetId },
      select: { id: true },
    });
    if (!datasetRow) {
      throw new NotFoundException('Dataset row not found in this task');
    }

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

    const taskCriteria = (evaluation.task.scoringCriteria ?? []) as unknown as Array<{
      label?: string;
      dimension?: string;
    }>;
    const scoringCriteria =
      taskCriteria.length > 0 ? taskCriteria.map((c) => c.label || c.dimension || '') : [];

    const jobData: AIEvaluationJobData = {
      evaluationId,
      datasetRowId: evaluation.datasetRowId,
      modelResponse: firstResponse.response,
      prompt: evaluation.datasetRow.prompt,
      context: evaluation.datasetRow.context,
      expectedOutput: evaluation.datasetRow.expectedOutput,
      scoringCriteria,
      organizationId: evaluation.task.organizationId,
    };

    try {
      await this.aiEvalQueue.add('ai-evaluate', jobData, {
        priority: 1,
        attempts: 2,
      });
      this.logger.log(`AI evaluation job queued for evaluation ${evaluationId}`);
    } catch (err) {
      this.logger.error(`Failed to queue AI evaluation for evaluation ${evaluationId}: ${err}`);
      // Non-blocking: return success anyway so the UI isn't stuck.
      // The AI suggestions won't be generated, but the evaluation is saved.
    }

    return { message: 'AI suggestions requested', evaluationId };
  }

  async findByTask(taskId: string, organizationId: string, query: TaskResultsQueryDto) {
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

  // ── AI Judge: disagreement & feedback ──────────────────────────────────

  /**
   * Analyze disagreement between evaluators on the same dataset rows. This is a
   * deterministic computation: for every row evaluated by 2+ evaluators, the
   * spread between the highest and lowest effective score is measured. Rows with
   * a spread >= 2 points (on a 10-point scale) are considered disputed.
   */
  async analyzeDisagreement(
    taskId: string,
    organizationId: string,
  ): Promise<EvaluatorDisagreementAnalysis> {
    const task = await this.prisma.evaluationTask.findFirst({
      where: { id: taskId, organizationId },
    });
    if (!task) throw new NotFoundException('Task not found');

    const evaluations = await this.prisma.evaluation.findMany({
      where: { taskId, status: 'COMPLETED' },
      select: {
        datasetRowId: true,
        overallScore: true,
        scores: true,
        comment: true,
        datasetRow: { select: { expectedOutput: true } },
        evaluator: { select: { name: true } },
      },
    });

    const byRow = new Map<string, typeof evaluations>();
    for (const evaluation of evaluations) {
      const bucket = byRow.get(evaluation.datasetRowId) ?? [];
      bucket.push(evaluation);
      byRow.set(evaluation.datasetRowId, bucket);
    }

    const problematicItems: EvaluatorDisagreementAnalysis['problematicItems'] = [];
    let disputeCount = 0;
    let multiEvaluatedCount = 0;

    for (const [datasetId, rowEvals] of byRow) {
      if (rowEvals.length < 2) continue;
      multiEvaluatedCount += 1;

      const effectiveScores = rowEvals.map((evaluation) =>
        this.effectiveScore(evaluation.scores, evaluation.overallScore),
      );
      const spread = Math.max(...effectiveScores) - Math.min(...effectiveScores);
      if (spread >= 2) disputeCount += 1;

      problematicItems.push({
        datasetRowId: datasetId,
        disagreementScore: Math.round(spread * 10) / 10,
        evaluatorOpinions: rowEvals
          .map((evaluation) => {
            const name = evaluation.evaluator?.name ?? 'Evaluator';
            const opinion = evaluation.comment?.trim();
            return opinion ? `${name}: ${opinion}` : `${name}: no comment`;
          })
          .slice(0, 5),
      });
    }

    problematicItems.sort((a, b) => b.disagreementScore - a.disagreementScore);

    const rowsMissingGroundTruth = problematicItems.filter(
      (item) => byRow.get(item.datasetRowId)?.[0]?.datasetRow?.expectedOutput == null,
    ).length;

    const disagreementRate =
      multiEvaluatedCount > 0 ? Math.round((disputeCount / multiEvaluatedCount) * 100) / 100 : 0;

    const rootCauses: string[] = [];
    if (multiEvaluatedCount > 0 && disagreementRate > 0.2 && rowsMissingGroundTruth > 0) {
      rootCauses.push(
        'Disputed rows often lack an expected output (ground truth), leaving evaluators to interpret quality subjectively.',
      );
    }
    if (multiEvaluatedCount > 0 && disagreementRate > 0.2) {
      rootCauses.push(
        'Evaluators may interpret the scoring criteria differently across the affected rows.',
      );
    }
    if (rootCauses.length === 0 && multiEvaluatedCount > 0) {
      rootCauses.push('Disagreement is within normal range; no systemic cause identified.');
    }

    const recommendations: string[] = [];
    if (problematicItems.length > 0) {
      recommendations.push(
        `Review and adjudicate the top ${Math.min(problematicItems.length, 5)} most-disputed rows.`,
      );
    }
    if (rowsMissingGroundTruth > 0) {
      recommendations.push(
        'Add expected outputs to disputed rows so evaluators score against a shared reference.',
      );
    }
    if (disputeCount > 0) {
      recommendations.push('Run an evaluator calibration session to align rubric interpretation.');
    }
    if (recommendations.length === 0) {
      recommendations.push(
        'No disputes detected. Keep the current rubric and continue monitoring.',
      );
    }

    return {
      taskId,
      disagreementRate,
      rootCauses,
      problematicItems: problematicItems.slice(0, 10),
      recommendations,
    };
  }

  /**
   * Summarize feedback across all completed evaluations for a task, using the
   * AI service (which fails open to heuristics when no provider key is set).
   */
  async getFeedbackSummary(taskId: string, organizationId: string): Promise<FeedbackSummary> {
    const task = await this.prisma.evaluationTask.findFirst({
      where: { id: taskId, organizationId },
    });
    if (!task) throw new NotFoundException('Task not found');

    const evaluations = await this.prisma.evaluation.findMany({
      where: { taskId, status: 'COMPLETED' },
      take: 200,
      select: { comment: true, overallScore: true, scores: true },
    });

    return this.aiService.summarizeFeedback(
      evaluations.map((evaluation) => ({
        comment: evaluation.comment,
        overallScore: evaluation.overallScore,
        scores: evaluation.scores as unknown as Record<string, number> | null,
      })),
    );
  }

  /**
   * Produce a single comparable 0-10 score per evaluation: use the overall score
   * when present, otherwise average the per-dimension scores.
   */
  private effectiveScore(scores: unknown, overallScore: number | null): number {
    if (overallScore != null) return overallScore;
    const parsed = (scores ?? []) as Array<{ score?: number }>;
    if (!Array.isArray(parsed) || parsed.length === 0) return 0;
    const sum = parsed.reduce(
      (acc, entry) => acc + (typeof entry.score === 'number' ? entry.score : 0),
      0,
    );
    return sum / parsed.length;
  }
}
