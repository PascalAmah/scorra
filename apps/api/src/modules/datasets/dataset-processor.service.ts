import { Injectable, Logger } from '@nestjs/common';
import { parse } from 'csv-parse/sync';
import { PrismaService } from '../../prisma/prisma.service';
import { Prisma, PromptType } from '@prisma/client';
import { DatasetProcessingJobData } from '@scorra/types';
import { StorageService } from '../../common/services/storage.service';

interface ParsedRow {
  prompt?: string;
  input?: string;
  question?: string;
  type?: string;
  context?: string;
  expected_output?: string;
  output?: string;
  metadata?: Record<string, unknown>;
  tags?: string[];
  [key: string]: unknown;
}

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
      const rows = await this.parseFile(data.fileUrl, data.format);

      if (rows.length === 0) {
        this.logger.warn(`Dataset ${data.datasetId} has 0 rows — marking READY`);
        await this.prisma.dataset.update({
          where: { id: data.datasetId },
          data: { status: 'READY', rowCount: 0 },
        });
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
            prompt: String(row.prompt || row.input || row.question || ''),
            promptType: this.resolvePromptType(row.type),
            context: row.context ? String(row.context) : null,
            expectedOutput: row.expected_output
              ? String(row.expected_output)
              : row.output
                ? String(row.output)
                : null,
            metadata: (row.metadata ?? {}) as Prisma.InputJsonValue,
            tags: (row.tags ?? []) as string[],
          })),
          skipDuplicates: true,
        });
        inserted += batch.length;
      }

      await this.prisma.dataset.update({
        where: { id: data.datasetId },
        data: { status: 'READY', rowCount: inserted },
      });

      this.logger.log(`Dataset ${data.datasetId} processed: ${inserted} rows`);
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

  private async parseFile(
    fileUrl: string,
    format: string,
  ): Promise<ParsedRow[]> {
    this.logger.debug(`Fetching and parsing file: ${fileUrl} as ${format}`);

    const buffer = await this.storage.download(fileUrl);
    const content = buffer.toString('utf-8');

    if (format === 'CSV') {
      return parse(content, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
        relax_column_count: true,
      }) as ParsedRow[];
    }

    if (format === 'JSON') {
      const parsed = JSON.parse(content);
      return Array.isArray(parsed) ? parsed : [parsed];
    }

    if (format === 'JSONL') {
      return content
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean)
        .map((line) => JSON.parse(line) as ParsedRow);
    }

    throw new Error(`Unsupported format: ${format}`);
  }

  private resolvePromptType(type?: string): PromptType {
    if (!type) return 'COMPLETION';
    const upper = type.toUpperCase();
    const validTypes: PromptType[] = [
      'COMPLETION', 'CHAT', 'INSTRUCTION', 'CLASSIFICATION',
      'SUMMARIZATION', 'TRANSLATION', 'CUSTOM',
    ];
    return validTypes.includes(upper as PromptType) ? (upper as PromptType) : 'COMPLETION';
  }
}
