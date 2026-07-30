import { Injectable, NotFoundException, ForbiddenException, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { SubmitComparisonDto } from './dto/submit-comparison.dto';
import { SubmitRankingDto } from './dto/submit-ranking.dto';

@Injectable()
export class ComparisonsService {
  private readonly logger = new Logger(ComparisonsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getNextPair(taskId: string, userId: string) {
    // Verify task exists and user is assigned
    const task = await this.prisma.evaluationTask.findUnique({
      where: { id: taskId },
      include: { assignments: { where: { evaluatorId: userId } } },
    });
    if (!task) throw new NotFoundException('Task not found');
    if (task.type !== 'PAIRWISE') throw new ForbiddenException('This endpoint is for pairwise comparison tasks');

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

  async submit(dto: SubmitComparisonDto, userId: string) {
    // Verify task and assignment
    const task = await this.prisma.evaluationTask.findUnique({ where: { id: dto.taskId } });
    if (!task) throw new NotFoundException('Task not found');

    const existing = await this.prisma.pairwiseComparison.findFirst({
      where: { taskId: dto.taskId, datasetRowId: dto.datasetRowId, evaluatorId: userId },
    });
    if (existing) throw new ForbiddenException('Already submitted a comparison for this item');

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
        dimensionVerdicts: (dto.dimensionVerdicts ?? []) as any,
        timeSpentSeconds: dto.timeSpentSeconds ?? null,
        status: 'COMPLETED',
        submittedAt: new Date(),
      },
    });
  }

  async getResults(taskId: string, userId: string) {
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

      if (c.verdict === 'A_BETTER') { modelWins[aName].wins++; modelWins[bName].losses++; }
      else if (c.verdict === 'B_BETTER') { modelWins[bName].wins++; modelWins[aName].losses++; }
      else { modelWins[aName].ties++; modelWins[bName].ties++; }
    }

    return {
      totalComparisons: comparisons.length,
      modelResults: Object.entries(modelWins).map(([model, stats]) => ({
        model,
        ...stats,
        winRate: stats.wins + stats.losses > 0
          ? (stats.wins / (stats.wins + stats.losses)).toFixed(3)
          : '0.000',
      })),
    };
  }

  async getNextRanking(taskId: string, userId: string) {
    const task = await this.prisma.evaluationTask.findUnique({
      where: { id: taskId },
      include: { assignments: { where: { evaluatorId: userId } } },
    });
    if (!task) throw new NotFoundException('Task not found');
    if (task.type !== 'RANKING') throw new ForbiddenException('This endpoint is for ranking tasks');

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

  async submitRanking(dto: SubmitRankingDto, userId: string) {
    const task = await this.prisma.evaluationTask.findUnique({ where: { id: dto.taskId } });
    if (!task) throw new NotFoundException('Task not found');

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
