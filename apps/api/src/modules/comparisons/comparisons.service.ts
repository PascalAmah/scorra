import { Injectable, NotFoundException, ForbiddenException, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { SubmitComparisonDto } from './dto/submit-comparison.dto';
import { SubmitRankingDto } from './dto/submit-ranking.dto';
import { assertEvaluatorAssigned } from '../../common/utils/task-access';

@Injectable()
export class ComparisonsService {
  private readonly logger = new Logger(ComparisonsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getNextPair(
    taskId: string,
    userId: string,
    organizationId: string,
  ): Promise<
    | { done: true; message: string }
    | {
        done: false;
        datasetRowId: string;
        prompt: string;
        context: string | null;
        responseA: { id: string; modelName: string; response: string };
        responseB: { id: string; modelName: string; response: string };
      }
  > {
    // Verify task exists, belongs to the org, is active, and user is assigned
    const task = await this.prisma.evaluationTask.findFirst({
      where: { id: taskId, organizationId },
      include: { assignments: { select: { evaluatorId: true } } },
    });
    if (!task) throw new NotFoundException('Task not found');
    if (task.status !== 'ACTIVE') throw new ForbiddenException('Task is not active');
    if (task.type !== 'PAIRWISE')
      throw new ForbiddenException('This endpoint is for pairwise comparison tasks');
    assertEvaluatorAssigned(task, userId);

    // Find a dataset row that hasn't been compared by this user
    const existingComparisons = await this.prisma.pairwiseComparison.findMany({
      where: { taskId, evaluatorId: userId },
      select: { datasetRowId: true },
    });
    const comparedRowIds = new Set(existingComparisons.map((c) => c.datasetRowId));

    const row = await this.prisma.datasetRow.findFirst({
      where: { datasetId: task.datasetId, id: { notIn: [...comparedRowIds] } },
      include: { modelResponses: { take: 2, orderBy: { createdAt: 'asc' } } },
    });

    if (!row || row.modelResponses.length < 2) {
      return { done: true, message: 'No more items to compare' };
    }

    return {
      done: false,
      datasetRowId: row.id,
      prompt: row.prompt,
      context: row.context,
      responseA: row.modelResponses[0],
      responseB: row.modelResponses[1],
    };
  }

  async submit(dto: SubmitComparisonDto, userId: string, organizationId: string) {
    // Verify task, org, active status, and assignment
    const task = await this.prisma.evaluationTask.findFirst({
      where: { id: dto.taskId, organizationId },
      include: { assignments: { select: { evaluatorId: true } } },
    });
    if (!task) throw new NotFoundException('Task not found');
    if (task.status !== 'ACTIVE') throw new ForbiddenException('Task is not active');
    assertEvaluatorAssigned(task, userId);

    const existing = await this.prisma.pairwiseComparison.findFirst({
      where: { taskId: dto.taskId, datasetRowId: dto.datasetRowId, evaluatorId: userId },
    });
    if (existing) throw new ForbiddenException('Already submitted a comparison for this item');

    const dimensionVerdicts: Prisma.InputJsonValue = (dto.dimensionVerdicts ?? []).map((v) => ({
      dimension: v.dimension,
      verdict: v.verdict,
      ...(v.note !== undefined && v.note !== null ? { note: v.note } : {}),
    }));

    return this.prisma.pairwiseComparison.create({
      data: {
        taskId: dto.taskId,
        datasetRowId: dto.datasetRowId,
        evaluatorId: userId,
        responseAId: dto.responseAId,
        responseBId: dto.responseBId,
        verdict: dto.verdict,
        confidenceScore: dto.confidenceScore ?? null,
        reasoning: dto.reasoning ?? null,
        dimensionVerdicts,
        timeSpentSeconds: dto.timeSpentSeconds ?? null,
        status: 'COMPLETED',
        submittedAt: new Date(),
      },
    });
  }

  async getResults(taskId: string, _userId: string) {
    const task = await this.prisma.evaluationTask.findUnique({ where: { id: taskId } });
    if (!task) throw new NotFoundException('Task not found');

    const comparisons = await this.prisma.pairwiseComparison.findMany({
      where: { taskId },
      include: {
        responseA: { select: { modelName: true } },
        responseB: { select: { modelName: true } },
      },
    });

    // Aggregate results
    const modelWins: Record<string, { wins: number; losses: number; ties: number }> = {};
    for (const c of comparisons) {
      if (!c.verdict) continue;
      const aName = c.responseA.modelName;
      const bName = c.responseB.modelName;
      if (!modelWins[aName]) modelWins[aName] = { wins: 0, losses: 0, ties: 0 };
      if (!modelWins[bName]) modelWins[bName] = { wins: 0, losses: 0, ties: 0 };

      if (c.verdict === 'A_BETTER') {
        modelWins[aName].wins++;
        modelWins[bName].losses++;
      } else if (c.verdict === 'B_BETTER') {
        modelWins[bName].wins++;
        modelWins[aName].losses++;
      } else {
        modelWins[aName].ties++;
        modelWins[bName].ties++;
      }
    }

    return {
      totalComparisons: comparisons.length,
      modelResults: Object.entries(modelWins).map(([model, stats]) => ({
        model,
        ...stats,
        winRate:
          stats.wins + stats.losses > 0
            ? (stats.wins / (stats.wins + stats.losses)).toFixed(3)
            : '0.000',
      })),
    };
  }

  async getItems(taskId: string, _userId: string) {
    const task = await this.prisma.evaluationTask.findUnique({ where: { id: taskId } });
    if (!task) throw new NotFoundException('Task not found');
    return this.prisma.pairwiseComparison.findMany({
      where: { taskId },
      orderBy: { updatedAt: 'desc' },
      include: {
        evaluator: { select: { name: true, email: true } },
        datasetRow: { select: { rowIndex: true, prompt: true } },
      },
    });
  }

  async getRankingResults(taskId: string, _userId: string) {
    const task = await this.prisma.evaluationTask.findUnique({ where: { id: taskId } });
    if (!task) throw new NotFoundException('Task not found');

    const results = await this.prisma.rankingResult.findMany({
      where: { taskId },
      orderBy: { submittedAt: 'desc' },
      include: {
        evaluator: { select: { id: true, name: true, email: true } },
        datasetRow: { select: { id: true, rowIndex: true, prompt: true } },
        entries: {
          orderBy: { rank: 'asc' },
          include: { response: { select: { id: true, modelName: true } } },
        },
      },
    });

    // Flatten the model name onto each entry so the client doesn't need to
    // know about the nested response relation.
    return results.map((ranking) => ({
      ...ranking,
      entries: ranking.entries.map((entry) => ({
        id: entry.id,
        responseId: entry.responseId,
        modelName: entry.response.modelName,
        rank: entry.rank,
        score: entry.score,
      })),
    }));
  }

  async getNextRanking(taskId: string, userId: string, organizationId: string) {
    const task = await this.prisma.evaluationTask.findFirst({
      where: { id: taskId, organizationId },
      include: { assignments: { select: { evaluatorId: true } } },
    });
    if (!task) throw new NotFoundException('Task not found');
    if (task.status !== 'ACTIVE') throw new ForbiddenException('Task is not active');
    if (task.type !== 'RANKING') throw new ForbiddenException('This endpoint is for ranking tasks');
    assertEvaluatorAssigned(task, userId);

    const existingRankings = await this.prisma.rankingResult.findMany({
      where: { taskId, evaluatorId: userId },
      select: { datasetRowId: true },
    });
    const rankedRowIds = new Set(existingRankings.map((r) => r.datasetRowId));

    const row = await this.prisma.datasetRow.findFirst({
      where: { datasetId: task.datasetId, id: { notIn: [...rankedRowIds] } },
      include: { modelResponses: true },
    });

    if (!row) {
      return { done: true, message: 'No more items to rank' };
    }

    // Shuffle responses for unbiased presentation
    const shuffled = [...row.modelResponses].sort(() => Math.random() - 0.5);

    return {
      done: false,
      datasetRowId: row.id,
      prompt: row.prompt,
      context: row.context,
      responses: shuffled.map((r) => ({
        id: r.id,
        modelName: r.modelName,
        response: r.response,
      })),
    };
  }

  async submitRanking(dto: SubmitRankingDto, userId: string, organizationId: string) {
    const task = await this.prisma.evaluationTask.findFirst({
      where: { id: dto.taskId, organizationId },
      include: { assignments: { select: { evaluatorId: true } } },
    });
    if (!task) throw new NotFoundException('Task not found');
    if (task.status !== 'ACTIVE') throw new ForbiddenException('Task is not active');
    assertEvaluatorAssigned(task, userId);

    const existing = await this.prisma.rankingResult.findFirst({
      where: { taskId: dto.taskId, datasetRowId: dto.datasetRowId, evaluatorId: userId },
    });
    if (existing) throw new ForbiddenException('Already submitted a ranking for this item');

    const ranking = await this.prisma.rankingResult.create({
      data: {
        taskId: dto.taskId,
        datasetRowId: dto.datasetRowId,
        evaluatorId: userId,
        comment: dto.comment ?? null,
        submittedAt: new Date(),
      },
    });

    await this.prisma.rankingEntry.createMany({
      data: dto.entries.map((e) => ({
        rankingResultId: ranking.id,
        responseId: e.responseId,
        rank: e.rank,
        score: e.score ?? null,
      })),
    });

    return ranking;
  }
}
