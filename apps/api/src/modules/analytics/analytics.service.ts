import { Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { OnEvent } from '@nestjs/event-emitter';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { PrismaService } from '../../prisma/prisma.service';
import {
  AgreementMetrics,
  AnalyticsComputationJobData,
  DashboardSummary,
  EvaluatorMetrics,
  PairwiseAgreement,
  QueueName,
  TaskScoreAnalytics,
} from '@scorra/types';

const AGREEMENT_TOLERANCE = 1.0;
/** Cache TTL in milliseconds (60 s). cache-manager v5 uses milliseconds. */
const CACHE_TTL_MS = 60_000;

const round3 = (value: number): number => Math.round(value * 1000) / 1000;
const round2 = (value: number): number => Math.round(value * 100) / 100;
const clamp01 = (value: number): number => Math.max(0, Math.min(1, value));

@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);

  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue(QueueName.ANALYTICS_COMPUTATION)
    private readonly analyticsQueue: Queue,
    @Inject(CACHE_MANAGER)
    private readonly cacheManager: Cache,
  ) {}

  // ── Public queries ──────────────────────────────────────────────────────

  async getTaskAgreement(taskId: string, organizationId: string): Promise<AgreementMetrics> {
    return this.withCache(`agreement:${taskId}:${organizationId}`, () =>
      this.computeTaskAgreement(taskId, organizationId),
    );
  }

  async getTaskScores(taskId: string, organizationId: string): Promise<TaskScoreAnalytics> {
    return this.withCache(`scores:${taskId}:${organizationId}`, () =>
      this.computeTaskScores(taskId, organizationId),
    );
  }

  async getEvaluatorMetrics(organizationId: string): Promise<EvaluatorMetrics[]> {
    return this.withCache(`evaluators:${organizationId}`, () =>
      this.computeEvaluatorMetrics(organizationId),
    );
  }

  async getDashboardSummary(organizationId: string): Promise<DashboardSummary> {
    return this.withCache(`dashboard:${organizationId}`, () =>
      this.computeDashboardSummary(organizationId),
    );
  }

  /**
   * Precompute and cache all metrics for an org (or a single task). Used by the
   * AnalyticsComputationWorker to warm the cache in the background.
   */
  async precompute(organizationId: string, taskId?: string) {
    const taskIds = taskId
      ? [taskId]
      : (
          await this.prisma.evaluationTask.findMany({
            where: { organizationId },
            select: { id: true },
          })
        ).map((task) => task.id);

    await this.getDashboardSummary(organizationId);
    await this.getEvaluatorMetrics(organizationId);
    for (const id of taskIds) {
      await this.getTaskAgreement(id, organizationId);
      await this.getTaskScores(id, organizationId);
    }

    return { success: true, tasksWarmed: taskIds.length };
  }

  // ── Event-driven cache invalidation + refresh ───────────────────────────

  @OnEvent('evaluation.submitted')
  async onEvaluationSubmitted(payload: { taskId: string }) {
    await this.refreshForTask(payload.taskId);
  }

  @OnEvent('task.completed')
  async onTaskCompleted(payload: { taskId: string }) {
    await this.refreshForTask(payload.taskId);
  }

  private async refreshForTask(taskId: string) {
    // Bust all cached keys — Redis del with a pattern isn't available without
    // SCAN, so we clear the keys we know could be stale.
    try {
      const task = await this.prisma.evaluationTask.findUnique({
        where: { id: taskId },
        select: { organizationId: true },
      });
      if (!task) return;

      await Promise.all([
        this.cacheManager.del(`agreement:${taskId}:${task.organizationId}`),
        this.cacheManager.del(`scores:${taskId}:${task.organizationId}`),
        this.cacheManager.del(`evaluators:${task.organizationId}`),
        this.cacheManager.del(`dashboard:${task.organizationId}`),
      ]);

      const data: AnalyticsComputationJobData = {
        organizationId: task.organizationId,
        taskId,
        computationType: 'SCORE_TRENDS',
      };
      await this.analyticsQueue.add('compute-analytics', data, { removeOnComplete: 100 });
    } catch (err) {
      this.logger.warn(`Failed to enqueue analytics refresh: ${(err as Error).message}`);
    }
  }

  // ── Agreement metrics ───────────────────────────────────────────────────

  private async computeTaskAgreement(
    taskId: string,
    organizationId: string,
  ): Promise<AgreementMetrics> {
    const task = await this.prisma.evaluationTask.findFirst({
      where: { id: taskId, organizationId },
      select: { id: true },
    });
    if (!task) throw new NotFoundException('Task not found');

    const evaluations = await this.prisma.evaluation.findMany({
      where: { taskId, status: 'COMPLETED' },
      select: {
        datasetRowId: true,
        evaluatorId: true,
        overallScore: true,
        scores: true,
      },
    });

    const byRow = new Map<string, Array<{ evaluatorId: string; effectiveScore: number }>>();
    for (const evaluation of evaluations) {
      const bucket = byRow.get(evaluation.datasetRowId) ?? [];
      bucket.push({
        evaluatorId: evaluation.evaluatorId,
        effectiveScore: this.effectiveScore(evaluation.scores, evaluation.overallScore),
      });
      byRow.set(evaluation.datasetRowId, bucket);
    }

    const coRatedRows: boolean[] = [];
    for (const [, rowEvals] of byRow) {
      if (rowEvals.length < 2) continue;
      const scores = rowEvals.map((entry) => entry.effectiveScore);
      coRatedRows.push(Math.max(...scores) - Math.min(...scores) <= AGREEMENT_TOLERANCE);
    }

    const overallAgreementRate =
      coRatedRows.length > 0
        ? coRatedRows.filter(Boolean).length / coRatedRows.length
        : 0;

    return {
      taskId,
      overallAgreementRate: round3(overallAgreementRate),
      fleissKappa: this.fleissKappa(byRow),
      krippendorffsAlpha: null,
      pairwiseAgreements: this.pairwiseAgreement(byRow),
    };
  }

  private pairwiseAgreement(
    byRow: Map<string, Array<{ evaluatorId: string; effectiveScore: number }>>,
  ): PairwiseAgreement[] {
    const evaluatorIds = new Set<string>();
    for (const rowEvals of byRow.values()) {
      for (const entry of rowEvals) evaluatorIds.add(entry.evaluatorId);
    }
    const ids = [...evaluatorIds];
    const pairs: PairwiseAgreement[] = [];

    for (let i = 0; i < ids.length; i += 1) {
      for (let j = i + 1; j < ids.length; j += 1) {
        const a = ids[i];
        const b = ids[j];
        const shared: Array<[number, number]> = [];
        for (const rowEvals of byRow.values()) {
          const ea = rowEvals.find((entry) => entry.evaluatorId === a);
          const eb = rowEvals.find((entry) => entry.evaluatorId === b);
          if (ea && eb) shared.push([ea.effectiveScore, eb.effectiveScore]);
        }
        if (shared.length === 0) continue;

        const agreements = shared.filter(([x, y]) => Math.abs(x - y) <= AGREEMENT_TOLERANCE);
        pairs.push({
          evaluatorAId: a,
          evaluatorBId: b,
          agreementRate: round3(agreements.length / shared.length),
          cohensKappa: this.cohensKappa(shared),
        });
      }
    }
    return pairs;
  }

  /** Cohen's kappa for a pair of raters, scores binarized at the 7/10 threshold. */
  private cohensKappa(shared: Array<[number, number]>): number | null {
    if (shared.length < 2) return null;
    const cat = (score: number) => (score >= 7 ? 1 : 0);

    const n = shared.length;
    let bothFail = 0;
    let bothPass = 0;
    for (const [x, y] of shared) {
      if (cat(x) === 0 && cat(y) === 0) bothFail += 1;
      else if (cat(x) === 1 && cat(y) === 1) bothPass += 1;
    }

    const observedAgreement = (bothFail + bothPass) / n;
    const pa = shared.filter(([x]) => cat(x) === 1).length / n;
    const pb = shared.filter(([, y]) => cat(y) === 1).length / n;
    const expectedAgreement = pa * pb + (1 - pa) * (1 - pb);

    if (expectedAgreement === 1) return null;
    return round3((observedAgreement - expectedAgreement) / (1 - expectedAgreement));
  }

  /** Fleiss kappa across all raters, scores binarized at the 7/10 threshold. */
  private fleissKappa(
    byRow: Map<string, Array<{ evaluatorId: string; effectiveScore: number }>>,
  ): number | null {
    const rows: number[][] = [];
    for (const rowEvals of byRow.values()) {
      if (rowEvals.length < 2) continue;
      rows.push(rowEvals.map((entry) => (entry.effectiveScore >= 7 ? 1 : 0)));
    }

    const nRows = rows.length;
    if (nRows === 0) return null;
    const raters = rows[0].length;

    const categories = [0, 1];
    const categoryCounts: Record<number, number> = { 0: 0, 1: 0 };
    for (const row of rows) {
      for (const category of row) categoryCounts[category] += 1;
    }
    const totalRatings = nRows * raters;
    const proportions = categories.map((category) => categoryCounts[category] / totalRatings);

    let agreementMean = 0;
    for (const row of rows) {
      const counts: Record<number, number> = { 0: 0, 1: 0 };
      for (const category of row) counts[category] += 1;
      const sumSquares = categories.reduce((sum, category) => sum + counts[category] ** 2, 0);
      agreementMean += (sumSquares - raters) / (raters * (raters - 1));
    }
    agreementMean /= nRows;

    const expectedAgreement = proportions.reduce((sum, p) => sum + p * p, 0);
    if (expectedAgreement === 1) return null;
    return round3((agreementMean - expectedAgreement) / (1 - expectedAgreement));
  }

  // ── Task score analytics ────────────────────────────────────────────────

  private async computeTaskScores(
    taskId: string,
    organizationId: string,
  ): Promise<TaskScoreAnalytics> {
    const task = await this.prisma.evaluationTask.findFirst({
      where: { id: taskId, organizationId },
      select: { id: true },
    });
    if (!task) throw new NotFoundException('Task not found');

    const evaluations = await this.prisma.evaluation.findMany({
      where: { taskId, status: 'COMPLETED' },
      select: { overallScore: true, scores: true },
    });

    const effectiveScores = evaluations.map((evaluation) =>
      this.effectiveScore(evaluation.scores, evaluation.overallScore),
    );

    const distribution = Array.from({ length: 10 }, (_, i) => ({
      bucket: `${i}-${i + 1}`,
      count: 0,
    }));
    for (const score of effectiveScores) {
      distribution[Math.min(9, Math.max(0, Math.floor(score)))].count += 1;
    }

    const labelCounts: Record<string, number> = {
      EXCELLENT: 0,
      GOOD: 0,
      FAIR: 0,
      POOR: 0,
    };
    for (const score of effectiveScores) {
      const label = score >= 8 ? 'EXCELLENT' : score >= 6.5 ? 'GOOD' : score >= 5 ? 'FAIR' : 'POOR';
      labelCounts[label] += 1;
    }

    const dimensionAgg = new Map<
      string,
      { label: string; total: number; count: number; min: number; max: number }
    >();
    for (const evaluation of evaluations) {
      const parsed = (evaluation.scores ?? []) as Array<{
        dimension?: string;
        label?: string;
        score?: number;
      }>;
      if (!Array.isArray(parsed)) continue;
      for (const entry of parsed) {
        if (typeof entry.score !== 'number') continue;
        const label = entry.label || entry.dimension || 'Unknown';
        const agg = dimensionAgg.get(label) ?? {
          label,
          total: 0,
          count: 0,
          min: Number.POSITIVE_INFINITY,
          max: Number.NEGATIVE_INFINITY,
        };
        agg.total += entry.score;
        agg.count += 1;
        agg.min = Math.min(agg.min, entry.score);
        agg.max = Math.max(agg.max, entry.score);
        dimensionAgg.set(label, agg);
      }
    }

    const dimensions = [...dimensionAgg.values()].map((agg) => ({
      dimension: agg.label,
      label: agg.label,
      averageScore: round2(agg.total / agg.count),
      minScore: agg.min,
      maxScore: agg.max,
      count: agg.count,
    }));

    const sorted = [...effectiveScores].sort((a, b) => a - b);
    const average =
      effectiveScores.length > 0
        ? round2(effectiveScores.reduce((a, b) => a + b, 0) / effectiveScores.length)
        : null;

    return {
      taskId,
      totalEvaluations: evaluations.length,
      averageScore: average,
      medianScore: sorted.length > 0 ? sorted[Math.floor(sorted.length / 2)] : null,
      minScore: sorted.length > 0 ? sorted[0] : null,
      maxScore: sorted.length > 0 ? sorted[sorted.length - 1] : null,
      distribution,
      dimensions,
      qualityLabelBreakdown: ['EXCELLENT', 'GOOD', 'FAIR', 'POOR'].map((label) => ({
        label,
        count: labelCounts[label],
      })),
    };
  }

  // ── Evaluator metrics ───────────────────────────────────────────────────

  private async computeEvaluatorMetrics(organizationId: string): Promise<EvaluatorMetrics[]> {
    const tasks = await this.prisma.evaluationTask.findMany({
      where: { organizationId },
      select: { id: true },
    });
    const taskIds = tasks.map((task) => task.id);
    if (taskIds.length === 0) return [];

    const evaluations = await this.prisma.evaluation.findMany({
      where: { taskId: { in: taskIds } },
      select: {
        evaluatorId: true,
        status: true,
        overallScore: true,
        scores: true,
        timeSpentSeconds: true,
        datasetRowId: true,
        taskId: true,
        evaluator: { select: { name: true } },
      },
    });

    const byEvaluator = new Map<
      string,
      { name: string; items: typeof evaluations }
    >();
    for (const evaluation of evaluations) {
      const bucket = byEvaluator.get(evaluation.evaluatorId) ?? {
        name: evaluation.evaluator?.name ?? 'Unknown',
        items: [],
      };
      bucket.items.push(evaluation);
      byEvaluator.set(evaluation.evaluatorId, bucket);
    }

    // Co-rated rows across all tasks: key = taskId:datasetRowId
    const coRated = new Map<string, Array<{ evaluatorId: string; effectiveScore: number }>>();
    for (const evaluation of evaluations) {
      if (evaluation.status !== 'COMPLETED') continue;
      const key = `${evaluation.taskId}:${evaluation.datasetRowId}`;
      const bucket = coRated.get(key) ?? [];
      bucket.push({
        evaluatorId: evaluation.evaluatorId,
        effectiveScore: this.effectiveScore(evaluation.scores, evaluation.overallScore),
      });
      coRated.set(key, bucket);
    }

    const metrics: EvaluatorMetrics[] = [];
    for (const [evaluatorId, { name, items }] of byEvaluator) {
      const completed = items.filter((item) => item.status === 'COMPLETED');
      const attempted = items.filter((item) =>
        ['PENDING', 'IN_PROGRESS', 'COMPLETED', 'FLAGGED'].includes(item.status),
      );

      const completedScores = completed.map((item) =>
        this.effectiveScore(item.scores, item.overallScore),
      );
      const averageScore =
        completedScores.length > 0
          ? round2(completedScores.reduce((a, b) => a + b, 0) / completedScores.length)
          : 0;

      const times = completed
        .map((item) => item.timeSpentSeconds)
        .filter((time): time is number => time != null);
      const averageTimePerEvaluation =
        times.length > 0 ? round2(times.reduce((a, b) => a + b, 0) / times.length) : 0;

      const completionRate =
        attempted.length > 0 ? round3(completed.length / attempted.length) : 0;

      // Agreement: fraction of co-rated rows where this evaluator is within
      // tolerance of the average score of the other raters on that row.
      let agreeing = 0;
      let coRatedCount = 0;
      for (const rowEvals of coRated.values()) {
        if (rowEvals.length < 2) continue;
        const mine = rowEvals.find((entry) => entry.evaluatorId === evaluatorId);
        if (!mine) continue;
        const others = rowEvals.filter((entry) => entry.evaluatorId !== evaluatorId);
        const otherAverage =
          others.reduce((a, b) => a + b.effectiveScore, 0) / others.length;
        coRatedCount += 1;
        if (Math.abs(mine.effectiveScore - otherAverage) <= AGREEMENT_TOLERANCE) agreeing += 1;
      }
      const agreementRate = coRatedCount > 0 ? round3(agreeing / coRatedCount) : 0;

      const mean =
        completedScores.length > 0
          ? completedScores.reduce((a, b) => a + b, 0) / completedScores.length
          : 0;
      const variance =
        completedScores.length > 0
          ? completedScores.reduce((acc, score) => acc + (score - mean) ** 2, 0) /
            completedScores.length
          : 0;
      const stddev = Math.sqrt(variance);
      const consistencyScore =
        completedScores.length < 2 ? 1 : clamp01(round3(1 - stddev / 5));

      metrics.push({
        evaluatorId,
        evaluatorName: name,
        totalEvaluations: completed.length,
        averageTimePerEvaluation,
        agreementRate,
        consistencyScore,
        completionRate,
        averageScore,
        evaluationPeriod: {
          from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          to: new Date(),
        },
      });
    }

    metrics.sort((a, b) => b.totalEvaluations - a.totalEvaluations);
    return metrics;
  }

  // ── Dashboard summary ───────────────────────────────────────────────────

  private async computeDashboardSummary(organizationId: string): Promise<DashboardSummary> {
    const tasks = await this.prisma.evaluationTask.findMany({
      where: { organizationId },
      select: { id: true },
    });
    const taskIds = tasks.map((task) => task.id);

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const totalEvaluations = taskIds.length
      ? await this.prisma.evaluation.count({ where: { taskId: { in: taskIds } } })
      : 0;
    const completedEvaluations = taskIds.length
      ? await this.prisma.evaluation.count({
          where: { taskId: { in: taskIds }, status: 'COMPLETED' },
        })
      : 0;
    const pendingEvaluations = taskIds.length
      ? await this.prisma.evaluation.count({
          where: { taskId: { in: taskIds }, status: { in: ['PENDING', 'IN_PROGRESS'] } },
        })
      : 0;
    const activeEvaluators = taskIds.length
      ? (
          await this.prisma.evaluation.findMany({
            where: { taskId: { in: taskIds } },
            distinct: ['evaluatorId'],
            select: { evaluatorId: true },
          })
        ).length
      : 0;
    const totalDatasets = await this.prisma.dataset.count({
      where: { organizationId },
    });
    const totalModels = await this.prisma.modelResponse.count({
      where: { datasetRow: { dataset: { organizationId } } },
    });

    const monthCompleted = taskIds.length
      ? await this.prisma.evaluation.findMany({
          where: { taskId: { in: taskIds }, status: 'COMPLETED', submittedAt: { gte: monthStart } },
          select: { overallScore: true, scores: true, aiSuggestions: true },
        })
      : [];

    const monthScores = monthCompleted.map((evaluation) =>
      this.effectiveScore(evaluation.scores, evaluation.overallScore),
    );
    const averageScoreThisMonth =
      monthScores.length > 0
        ? round2(monthScores.reduce((a, b) => a + b, 0) / monthScores.length)
        : 0;
    const hallucinationRateThisMonth =
      monthCompleted.length > 0
        ? round3(
            monthCompleted.filter(
              (evaluation) =>
                (evaluation.aiSuggestions as { hallucinationDetected?: boolean } | null)
                  ?.hallucinationDetected === true,
            ).length / monthCompleted.length,
          )
        : 0;

    const recentActivity = await this.buildRecentActivity(organizationId, taskIds);

    return {
      totalEvaluations,
      completedEvaluations,
      pendingEvaluations,
      activeEvaluators,
      totalDatasets,
      totalModels,
      averageScoreThisMonth,
      hallucinationRateThisMonth,
      recentActivity,
    };
  }

  private async buildRecentActivity(organizationId: string, taskIds: string[]) {
    const [evaluations, datasets, tasks, exports] = await Promise.all([
      taskIds.length
        ? this.prisma.evaluation.findMany({
            where: { taskId: { in: taskIds }, submittedAt: { not: null } },
            orderBy: { submittedAt: 'desc' },
            take: 5,
            select: {
              id: true,
              submittedAt: true,
              evaluator: { select: { id: true, name: true } },
              task: { select: { name: true } },
            },
          })
        : Promise.resolve([]),
      this.prisma.dataset.findMany({
        where: { organizationId },
        orderBy: { createdAt: 'desc' },
        take: 3,
        select: {
          id: true,
          createdAt: true,
          name: true,
          createdBy: { select: { id: true, name: true } },
        },
      }),
      this.prisma.evaluationTask.findMany({
        where: { organizationId },
        orderBy: { createdAt: 'desc' },
        take: 3,
        select: {
          id: true,
          createdAt: true,
          name: true,
          createdBy: { select: { id: true, name: true } },
        },
      }),
      this.prisma.export.findMany({
        where: { organizationId, status: 'READY' },
        orderBy: { completedAt: 'desc' },
        take: 3,
        select: {
          id: true,
          completedAt: true,
          requestedBy: { select: { id: true, name: true } },
          task: { select: { name: true } },
        },
      }),
    ]);

    const items = [
      ...evaluations.map((evaluation) => ({
        id: `ev:${evaluation.id}`,
        type: 'EVALUATION_SUBMITTED' as const,
        description: `Evaluation submitted on "${evaluation.task?.name ?? 'task'}"`,
        userId: evaluation.evaluator?.id ?? '',
        userName: evaluation.evaluator?.name ?? 'Unknown',
        createdAt: evaluation.submittedAt!,
      })),
      ...datasets.map((dataset) => ({
        id: `ds:${dataset.id}`,
        type: 'DATASET_UPLOADED' as const,
        description: `Dataset "${dataset.name}" uploaded`,
        userId: dataset.createdBy?.id ?? '',
        userName: dataset.createdBy?.name ?? 'Unknown',
        createdAt: dataset.createdAt,
      })),
      ...tasks.map((task) => ({
        id: `task:${task.id}`,
        type: 'TASK_CREATED' as const,
        description: `Task "${task.name}" created`,
        userId: task.createdBy?.id ?? '',
        userName: task.createdBy?.name ?? 'Unknown',
        createdAt: task.createdAt,
      })),
      ...exports.map((exportItem) => ({
        id: `exp:${exportItem.id}`,
        type: 'EXPORT_READY' as const,
        description: `Export ready for "${exportItem.task?.name ?? 'task'}"`,
        userId: exportItem.requestedBy?.id ?? '',
        userName: exportItem.requestedBy?.name ?? 'Unknown',
        createdAt: exportItem.completedAt ?? new Date(),
      })),
    ];

    return items
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 10);
  }

  // ── Helpers ─────────────────────────────────────────────────────────────

  private async withCache<T>(key: string, compute: () => Promise<T>): Promise<T> {
    const cached = await this.cacheManager.get<T>(key);
    if (cached !== null && cached !== undefined) {
      return cached;
    }
    const value = await compute();
    // cache-manager v5 TTL is in milliseconds
    await this.cacheManager.set(key, value, CACHE_TTL_MS);
    return value;
  }

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
