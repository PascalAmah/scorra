import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { StorageService } from '../../common/services/storage.service';
import { Prisma, EvaluationTask } from '@prisma/client';

interface ExportFilters {
  includeAiJudge?: boolean;
  includeNotes?: boolean;
  disagreementsOnly?: boolean;
  flaggedOnly?: boolean;
  dateRange?: string;
}

type ExportRow = Record<string, unknown>;

const FORMAT_EXTENSIONS: Record<string, string> = {
  JSONL: 'jsonl',
  CSV: 'csv',
  JSON: 'json',
};

const FORMAT_MIME: Record<string, string> = {
  JSONL: 'application/jsonl',
  CSV: 'text/csv',
  JSON: 'application/json',
};

/**
 * Generates an export file for an evaluation task by querying the current
 * submissions (evaluations / comparisons / rankings), serializing them to the
 * requested format and storing the file.
 *
 * Lifecycle transition handled here:
 *   PENDING -> PROCESSING -> READY | FAILED
 */
@Injectable()
export class ExportGenerationService {
  private readonly logger = new Logger(ExportGenerationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  async generateExport(data: {
    exportId: string;
    taskId: string;
    organizationId: string;
    format: 'JSONL' | 'CSV' | 'JSON';
    filters?: Record<string, unknown>;
  }): Promise<{ rowCount: number; fileUrl: string }> {
    const { exportId, taskId, organizationId, format } = data;
    const filters = (data.filters ?? {}) as ExportFilters;

    await this.setStatus(exportId, 'PROCESSING');

    try {
      const task = await this.prisma.evaluationTask.findFirst({
        where: { id: taskId, organizationId },
      });
      if (!task) {
        throw new Error(`Task ${taskId} not found for organization ${organizationId}`);
      }

      const rows = await this.collectRows(task, filters);
      const buffer = Buffer.from(this.serialize(rows, format, task), 'utf-8');
      const key = `exports/${organizationId}/${exportId}.${FORMAT_EXTENSIONS[format] ?? 'json'}`;
      const fileUrl = await this.storage.upload(buffer, key);

      await this.setStatus(exportId, 'READY', {
        fileUrl,
        fileSize: buffer.length,
        rowCount: rows.length,
        completedAt: new Date(),
        errorMessage: null,
      });

      this.logger.log(`Export ${exportId} ready: ${rows.length} rows (${format})`);
      return { rowCount: rows.length, fileUrl };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Export generation failed';
      this.logger.error(`Export ${exportId} generation failed: ${message}`, error as Error);
      await this.setStatus(exportId, 'FAILED', {
        errorMessage: message,
        completedAt: new Date(),
      });
      throw error;
    }
  }

  /** Read the stored file for a completed export so it can be streamed. */
  async getExportFile(
    id: string,
    organizationId: string,
  ): Promise<{ buffer: Buffer; filename: string; contentType: string }> {
    const record = await this.prisma.export.findFirst({ where: { id, organizationId } });
    if (!record || record.status !== 'READY' || !record.fileUrl) {
      throw new Error('Export not ready for download');
    }

    const buffer = await this.storage.download(record.fileUrl);
    return {
      buffer,
      filename: `${id}.${FORMAT_EXTENSIONS[record.format] ?? 'json'}`,
      contentType: FORMAT_MIME[record.format] ?? 'application/octet-stream',
    };
  }

  private async setStatus(
    id: string,
    status: Prisma.ExportUpdateInput['status'],
    extra: Prisma.ExportUpdateInput = {},
  ): Promise<void> {
    await this.prisma.export.update({ where: { id }, data: { status, ...extra } });
  }

  // ── Row collection ────────────────────────────────────────────────

  private async collectRows(task: EvaluationTask, filters: ExportFilters): Promise<ExportRow[]> {
    const dateFilter = this.buildDateFilter(filters.dateRange);

    switch (task.type) {
      case 'PAIRWISE':
        return this.collectComparisons(task, filters, dateFilter);
      case 'RANKING':
        return this.collectRankings(task, filters, dateFilter);
      case 'SINGLE':
      default:
        return this.collectEvaluations(task, filters, dateFilter);
    }
  }

  private async collectEvaluations(
    task: EvaluationTask,
    filters: ExportFilters,
    dateFilter: { submittedAt?: { gte: Date } } | undefined,
  ): Promise<ExportRow[]> {
    const evaluations = await this.prisma.evaluation.findMany({
      where: { taskId: task.id, status: 'COMPLETED', ...dateFilter },
      include: {
        evaluator: { select: { id: true, name: true, email: true } },
        datasetRow: {
          select: {
            rowIndex: true,
            prompt: true,
            context: true,
            expectedOutput: true,
            metadata: true,
            tags: true,
          },
        },
      },
    });

    const rows: ExportRow[] = evaluations.map((evaluation) => {
      const scores = (evaluation.scores ?? []) as Array<{
        dimension?: string;
        label?: string;
        score?: number;
        confidence?: number;
        note?: string;
      }>;
      const flagged =
        (evaluation.tags ?? []).includes('flagged') ||
        Boolean(
          (evaluation.aiSuggestions as { hallucinationDetected?: boolean } | null)
            ?.hallucinationDetected,
        );

      const row: ExportRow = {
        taskId: task.id,
        taskName: task.name,
        taskType: task.type,
        rowIndex: evaluation.datasetRow.rowIndex,
        prompt: evaluation.datasetRow.prompt,
        context: evaluation.datasetRow.context,
        expectedOutput: evaluation.datasetRow.expectedOutput,
        metadata: evaluation.datasetRow.metadata,
        rowTags: evaluation.datasetRow.tags,
        evaluatorId: evaluation.evaluatorId,
        evaluator: evaluation.evaluator.name,
        dimensionScores: scores,
        overallScore: evaluation.overallScore,
        flagged,
        submittedAt: evaluation.submittedAt,
        timeSpentSeconds: evaluation.timeSpentSeconds,
      };

      if (filters.includeNotes !== false && evaluation.comment) {
        row.comment = evaluation.comment;
      }
      if (filters.includeAiJudge !== false && evaluation.aiSuggestions) {
        row.aiSuggestion = evaluation.aiSuggestions;
      }

      return row;
    });

    let result = rows;

    if (filters.flaggedOnly) {
      result = result.filter((row) => row.flagged === true);
    } else if (filters.disagreementsOnly) {
      // Keep rows that were double-evaluated with a meaningful score spread.
      const byRow = new Map<number, ExportRow[]>();
      for (const row of result) {
        const key = Number(row.rowIndex);
        const bucket = byRow.get(key) ?? [];
        bucket.push(row);
        byRow.set(key, bucket);
      }
      result = result.filter((row) => {
        const bucket = byRow.get(Number(row.rowIndex)) ?? [];
        if (bucket.length < 2) return false;
        const scores = bucket
          .map((r) => Number(r.overallScore))
          .filter((v) => !Number.isNaN(v));
        if (scores.length < 2) return false;
        const spread = Math.max(...scores) - Math.min(...scores);
        return spread >= 2;
      });
    }

    return result;
  }

  private async collectComparisons(
    task: EvaluationTask,
    filters: ExportFilters,
    dateFilter: { submittedAt?: { gte: Date } } | undefined,
  ): Promise<ExportRow[]> {
    const comparisons = await this.prisma.pairwiseComparison.findMany({
      where: { taskId: task.id, status: 'COMPLETED', ...dateFilter },
      include: {
        evaluator: { select: { id: true, name: true } },
        datasetRow: { select: { rowIndex: true, prompt: true, context: true } },
        responseA: { select: { modelName: true, response: true } },
        responseB: { select: { modelName: true, response: true } },
      },
    });

    let rows: ExportRow[] = comparisons.map((comparison) => {
      const row: ExportRow = {
        taskId: task.id,
        taskName: task.name,
        taskType: task.type,
        rowIndex: comparison.datasetRow.rowIndex,
        prompt: comparison.datasetRow.prompt,
        context: comparison.datasetRow.context,
        evaluatorId: comparison.evaluatorId,
        evaluator: comparison.evaluator.name,
        responseA: {
          modelName: comparison.responseA.modelName,
          response: comparison.responseA.response,
        },
        responseB: {
          modelName: comparison.responseB.modelName,
          response: comparison.responseB.response,
        },
        verdict: comparison.verdict,
        confidenceScore: comparison.confidenceScore,
        timeSpentSeconds: comparison.timeSpentSeconds,
        submittedAt: comparison.submittedAt,
      };

      if (filters.includeNotes !== false && comparison.reasoning) {
        row.reasoning = comparison.reasoning;
      }
      if (comparison.dimensionVerdicts) {
        row.dimensionVerdicts = comparison.dimensionVerdicts;
      }
      return row;
    });

    if (filters.flaggedOnly) {
      rows = rows.filter((row) => row.verdict === 'BOTH_BAD');
    } else if (filters.disagreementsOnly) {
      rows = rows.filter(
        (row) => row.verdict === 'A_BETTER' || row.verdict === 'B_BETTER',
      );
    }

    return rows;
  }

  private async collectRankings(
    task: EvaluationTask,
    filters: ExportFilters,
    dateFilter: { submittedAt?: { gte: Date } } | undefined,
  ): Promise<ExportRow[]> {
    const rankings = await this.prisma.rankingResult.findMany({
      where: { taskId: task.id, ...dateFilter },
      include: {
        evaluator: { select: { id: true, name: true } },
        datasetRow: { select: { rowIndex: true, prompt: true, context: true } },
        entries: {
          orderBy: { rank: 'asc' },
          include: { response: { select: { modelName: true, response: true } } },
        },
      },
    });

    return rankings.map((ranking) => {
      const row: ExportRow = {
        taskId: task.id,
        taskName: task.name,
        taskType: task.type,
        rowIndex: ranking.datasetRow.rowIndex,
        prompt: ranking.datasetRow.prompt,
        context: ranking.datasetRow.context,
        evaluatorId: ranking.evaluatorId,
        evaluator: ranking.evaluator.name,
        ranking: ranking.entries.map((entry) => ({
          rank: entry.rank,
          score: entry.score,
          modelName: entry.response.modelName,
          response: entry.response.response,
        })),
        submittedAt: ranking.submittedAt,
      };
      if (filters.includeNotes !== false && ranking.comment) {
        row.comment = ranking.comment;
      }
      return row;
    });
  }

  private buildDateFilter(
    dateRange?: string,
  ): { submittedAt?: { gte: Date } } | undefined {
    switch (dateRange) {
      case 'Last 7 days':
        return { submittedAt: { gte: new Date(Date.now() - 7 * 86400000) } };
      case 'Last 30 days':
        return { submittedAt: { gte: new Date(Date.now() - 30 * 86400000) } };
      default:
        return undefined;
    }
  }

  // ── Serialization ────────────────────────────────────────────────

  private serialize(rows: ExportRow[], format: string, task: EvaluationTask): string {
    switch (format) {
      case 'JSONL':
        return rows.map((r) => JSON.stringify(r)).join('\n') + '\n';
      case 'JSON':
        return JSON.stringify({ task: { id: task.id, name: task.name, type: task.type }, rowCount: rows.length, rows }, null, 2);
      case 'CSV':
      default:
        return this.toCSV(rows);
    }
  }

  private toCSV(rows: ExportRow[]): string {
    if (rows.length === 0) return '';

    const headers = Array.from(new Set(rows.flatMap((row) => Object.keys(row))));
    const esc = (value: unknown): string => {
      if (value == null) return '';
      const text = typeof value === 'object' ? JSON.stringify(value) : String(value);
      return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
    };

    return [
      headers.join(','),
      ...rows.map((row) => headers.map((header) => esc(row[header])).join(',')),
    ].join('\n');
  }
}