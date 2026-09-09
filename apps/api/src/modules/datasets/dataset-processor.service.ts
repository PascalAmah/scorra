import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { DatasetProcessingJobData } from '@scorra/types';
import { StorageService } from '../../common/services/storage.service';
import {
  ParsedModelResponse,
  ParsedRow,
  parseDatasetRows,
  rowExpectedOutput,
  rowModelResponses,
  rowPrompt,
  rowPromptType,
} from './dataset-parser';

@Injectable()
export class DatasetProcessorService {
  private readonly logger = new Logger(DatasetProcessorService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  async processDataset(data: DatasetProcessingJobData): Promise<{ rowCount: number }> {
    this.logger.log(`Processing dataset ${data.datasetId}`);

    try {
      const buffer = await this.storage.download(data.fileUrl);
      const rows = parseDatasetRows(buffer);

      if (rows.length === 0) {
        this.logger.warn(`Dataset ${data.datasetId} has 0 rows — marking READY`);
        await this.prisma.dataset.update({
          where: { id: data.datasetId },
          data: { status: 'READY', rowCount: 0 },
        });
        await this.recordVersion(data.datasetId, data.fileUrl, 0, data.uploadedById);
        return { rowCount: 0 };
      }

      // Batch insert rows
      const BATCH_SIZE = 500;
      let inserted = 0;

      for (let i = 0; i < rows.length; i += BATCH_SIZE) {
        const batch = rows.slice(i, i + BATCH_SIZE);
        await this.prisma.datasetRow.createMany({
          data: batch.map((row, idx) => ({
            datasetId: data.datasetId,
            rowIndex: i + idx,
            prompt: rowPrompt(row),
            promptType: rowPromptType(row.type),
            context: row.context ? String(row.context) : null,
            expectedOutput: rowExpectedOutput(row),
            metadata: (row.metadata ?? {}) as Prisma.InputJsonValue,
            tags: (row.tags ?? []) as string[],
          })),
          skipDuplicates: true,
        });
        inserted += batch.length;
      }

      // Create model responses from `response` / `responses` columns if present
      const modelResponses = await this.createModelResponses(data.datasetId, rows);

      await this.prisma.dataset.update({
        where: { id: data.datasetId },
        data: { status: 'READY', rowCount: inserted },
      });
      await this.recordVersion(data.datasetId, data.fileUrl, inserted, data.uploadedById);

      this.logger.log(
        `Dataset ${data.datasetId} processed: ${inserted} rows, ${modelResponses} model responses`,
      );
      return { rowCount: inserted };
    } catch (error) {
      this.logger.error(`Failed to process dataset ${data.datasetId}`, error);
      await this.prisma.dataset.update({
        where: { id: data.datasetId },
        data: { status: 'FAILED' },
      });
      throw error;
    }
  }

  private async createModelResponses(datasetId: string, rows: ParsedRow[]) {
    // Collect response data first so imports without response columns stay untouched.
    const withResponses: Array<{ rowIndex: number; responses: ParsedModelResponse[] }> = [];
    rows.forEach((row, index) => {
      const parsed = rowModelResponses(row);
      if (parsed.length) withResponses.push({ rowIndex: index, responses: parsed });
    });

    if (withResponses.length === 0) return 0;

    const created = await this.prisma.datasetRow.findMany({
      where: { datasetId },
      select: { id: true, rowIndex: true },
    });
    const rowIdByIndex = new Map(created.map((r) => [r.rowIndex, r.id]));

    const responses: Prisma.ModelResponseCreateManyInput[] = [];
    for (const entry of withResponses) {
      const rowId = rowIdByIndex.get(entry.rowIndex);
      if (!rowId) continue;
      for (const mr of entry.responses) {
        responses.push({
          datasetRowId: rowId,
          modelId: mr.modelId,
          modelName: mr.modelName,
          provider: mr.provider,
          response: mr.response,
        });
      }
    }

    if (responses.length === 0) return 0;

    // The imported file is authoritative for responses: replace any prior
    // responses on this dataset's rows (e.g. from an earlier version).
    await this.prisma.modelResponse.deleteMany({
      where: { datasetRow: { datasetId } },
    });
    await this.prisma.modelResponse.createMany({ data: responses });
    return responses.length;
  }

  private async recordVersion(
    datasetId: string,
    fileUrl: string,
    rowCount: number,
    createdById: string,
  ) {
    const dataset = await this.prisma.dataset.findUnique({ where: { id: datasetId } });
    if (!dataset) return;

    const existingVersions = await this.prisma.datasetVersion.count({ where: { datasetId } });
    const newVersion = existingVersions === 0 ? dataset.version : dataset.version + 1;

    await this.prisma.datasetVersion.create({
      data: {
        datasetId,
        version: newVersion,
        rowCount,
        fileUrl,
        changelog: null,
        createdById,
      },
    });

    await this.prisma.dataset.update({
      where: { id: datasetId },
      data: { version: newVersion },
    });
  }
}
