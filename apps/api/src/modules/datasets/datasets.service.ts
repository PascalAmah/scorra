import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { PrismaService } from '../../prisma/prisma.service';
import { StorageService } from '../../common/services/storage.service';
import { AiService } from '../ai/ai.service';
import { CreateDatasetDto } from './dto/create-dataset.dto';
import { CreatePromptDto } from './dto/create-prompt.dto';
import { UpdateDatasetDto } from './dto/update-dataset.dto';
import { PaginationDto, buildPaginationMeta } from '../../common/dto/pagination.dto';
import {
  QueueName,
  DatasetProcessingJobData,
  DatasetVersionDiff,
  ModelInferenceJobData,
  PromptType,
} from '@scorra/types';
import { Prisma } from '@prisma/client';
import {
  parseDatasetRows,
  rowExpectedOutput,
  rowPrompt,
  rowPromptType,
  type ParsedRow,
} from './dataset-parser';

@Injectable()
export class DatasetsService {
  private readonly logger = new Logger(DatasetsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    private readonly aiService: AiService,
    @InjectQueue(QueueName.DATASET_PROCESSING)
    private readonly datasetQueue: Queue,
    @InjectQueue(QueueName.MODEL_INFERENCE)
    private readonly modelInferenceQueue: Queue,
  ) {}

  async create(organizationId: string, userId: string, dto: CreateDatasetDto) {
    const dataset = await this.prisma.dataset.create({
      data: {
        name: dto.name,
        description: dto.description,
        organizationId,
        createdById: userId,
        format: dto.format,
        tags: dto.tags ?? [],
        status: 'PENDING',
      },
    });

    this.logger.log(`Dataset created: ${dataset.id} by user ${userId}`);
    return dataset;
  }

  async uploadFile(
    datasetId: string,
    organizationId: string,
    userId: string,
    file: Express.Multer.File,
  ) {
    const dataset = await this.findOneOrThrow(datasetId, organizationId);

    if (dataset.status === 'PROCESSING') {
      throw new BadRequestException('Dataset is already being processed');
    }

    // Generate a unique storage key
    // const ext = file.originalname.split('.').pop() ?? 'csv';
    const storageKey = `datasets/${datasetId}/v${dataset.version}/${Date.now()}-${file.originalname}`;

    // Upload file via storage service (local disk or S3)
    const fileUrl = await this.storage.upload(file.buffer, storageKey, file.mimetype);

    // Update dataset status immediately so the UI reflects progress.
    // The queue job is best-effort — if Redis is down we log and continue;
    // the file is still stored and the dataset is still usable.
    await this.prisma.dataset.update({
      where: { id: datasetId },
      data: { fileUrl, status: 'PROCESSING' },
    });

    const jobData: DatasetProcessingJobData = {
      datasetId,
      organizationId,
      fileUrl, // storage key — used by worker to download
      format: dataset.format,
      uploadedById: userId,
    };

    try {
      await this.datasetQueue.add('process-dataset', jobData, {
        attempts: 3,
        backoff: { type: 'exponential', delay: 3000 },
      });
      this.logger.log(`Dataset ${datasetId} queued for processing`);
    } catch (err) {
      this.logger.error(`Failed to queue processing for dataset ${datasetId}: ${err}`);
      // Non-blocking: mark as failed so the UI shows the error state,
      // but don't throw — the file is already uploaded.
      await this.prisma.dataset
        .update({ where: { id: datasetId }, data: { status: 'FAILED' } })
        .catch(() => undefined);
    }

    return { message: 'File uploaded and queued for processing', datasetId };
  }

  async findAll(organizationId: string, query: PaginationDto) {
    const where: Prisma.DatasetWhereInput = {
      organizationId,
      ...(query.search && {
        OR: [
          { name: { contains: query.search, mode: 'insensitive' } },
          { description: { contains: query.search, mode: 'insensitive' } },
        ],
      }),
    };

    const [datasets, total] = await Promise.all([
      this.prisma.dataset.findMany({
        where,
        skip: query.skip,
        take: query.limit,
        orderBy: { [query.sortBy ?? 'createdAt']: query.sortOrder ?? 'desc' },
        include: {
          createdBy: { select: { id: true, name: true, email: true } },
          _count: { select: { rows: true, tasks: true } },
        },
      }),
      this.prisma.dataset.count({ where }),
    ]);

    return {
      data: datasets,
      pagination: buildPaginationMeta(total, query.page ?? 1, query.limit ?? 20),
    };
  }

  async findOne(id: string, organizationId: string) {
    return this.findOneOrThrow(id, organizationId);
  }

  async getRows(datasetId: string, organizationId: string, query: PaginationDto) {
    await this.findOneOrThrow(datasetId, organizationId);

    const [rows, total] = await Promise.all([
      this.prisma.datasetRow.findMany({
        where: { datasetId },
        skip: query.skip,
        take: query.limit,
        orderBy: { rowIndex: 'asc' },
        include: {
          _count: { select: { modelResponses: true, evaluations: true } },
        },
      }),
      this.prisma.datasetRow.count({ where: { datasetId } }),
    ]);

    return {
      data: rows,
      pagination: buildPaginationMeta(total, query.page ?? 1, query.limit ?? 20),
    };
  }

  /** Fetch a single dataset row with its model responses (for detail views). */
  async getRow(datasetId: string, rowId: string, organizationId: string) {
    await this.findOneOrThrow(datasetId, organizationId);

    const row = await this.prisma.datasetRow.findFirst({
      where: { id: rowId, datasetId },
      include: { modelResponses: { orderBy: { createdAt: 'asc' } } },
    });

    if (!row) {
      throw new NotFoundException(`Row ${rowId} not found in dataset ${datasetId}`);
    }

    return row;
  }

  async createPrompt(organizationId: string, userId: string, dto: CreatePromptDto) {
    await this.findOneOrThrow(dto.datasetId, organizationId);

    const lastRow = await this.prisma.datasetRow.findFirst({
      where: { datasetId: dto.datasetId },
      orderBy: { rowIndex: 'desc' },
    });

    const rowIndex = (lastRow?.rowIndex ?? -1) + 1;

    const row = await this.prisma.datasetRow.create({
      data: {
        datasetId: dto.datasetId,
        rowIndex,
        prompt: dto.prompt,
        promptType: dto.promptType ?? 'COMPLETION',
        context: dto.context,
        expectedOutput: dto.expectedOutput,
        metadata: (dto.metadata ?? {}) as Prisma.InputJsonValue,
        tags: dto.tags ?? [],
      },
    });

    // Update row count
    await this.prisma.dataset.update({
      where: { id: dto.datasetId },
      data: { rowCount: { increment: 1 } },
    });

    return row;
  }

  /**
   * Queue generation of an AI response for every row that lacks one, using the
   * organization's configured AI provider. Rows that already have a response
   * (e.g. from an uploaded `response` column) are left untouched.
   */
  async generateResponses(id: string, organizationId: string, userId: string) {
    const dataset = await this.findOneOrThrow(id, organizationId);

    if (dataset.status !== 'READY' && dataset.status !== 'PROCESSING') {
      throw new BadRequestException('Dataset must be READY to generate responses');
    }

    if (!this.aiService.isGenerationConfigured()) {
      throw new BadRequestException(
        'No AI provider configured — set AI_PROVIDER and a matching API key in apps/api/.env',
      );
    }

    const pending = await this.prisma.datasetRow.count({
      where: { datasetId: id, modelResponses: { none: {} } },
    });
    if (pending === 0) {
      throw new BadRequestException('Every row already has a model response');
    }

    const info = this.aiService.getGenerationInfo();

    const jobData: ModelInferenceJobData = {
      datasetId: id,
      organizationId,
      requestedById: userId,
    };
    try {
      await this.modelInferenceQueue.add('generate-responses', jobData, {
        attempts: 2,
        backoff: { type: 'exponential', delay: 5000 },
      });
      this.logger.log(`Response generation queued for dataset ${id} (${pending} rows)`);
    } catch (err) {
      this.logger.error(`Failed to queue response generation for dataset ${id}: ${err}`);
      // Non-blocking: return the queuing message anyway so the UI isn't stuck.
      // The job can be retried manually or when Redis recovers.
    }
    return {
      message: `Queued AI response generation for ${pending} rows via ${info.provider} / ${info.modelId}`,
      datasetId: id,
      pending,
      provider: info.provider,
      model: info.modelId,
    };
  }

  async archive(id: string, organizationId: string) {
    await this.findOneOrThrow(id, organizationId);
    return this.prisma.dataset.update({
      where: { id },
      data: { status: 'ARCHIVED' },
    });
  }

  async delete(id: string, organizationId: string, userId: string) {
    const dataset = await this.findOneOrThrow(id, organizationId);

    if (dataset.createdById !== userId) {
      throw new ForbiddenException('Only the dataset creator can delete it');
    }

    // Delete stored file if present
    if (dataset.fileUrl) {
      try {
        await this.storage.delete(dataset.fileUrl);
      } catch {
        this.logger.warn(`Failed to delete file for dataset ${id}`);
      }
    }

    // Evaluation tasks reference the dataset with no cascade, so remove them
    // first (their evaluations, comparisons, rankings and assignments cascade
    // with the task; exports keep their taskId nulled).
    await this.prisma.evaluationTask.deleteMany({ where: { datasetId: id } });

    await this.prisma.dataset.delete({ where: { id } });
    return { message: 'Dataset deleted' };
  }

  async update(
    id: string,
    organizationId: string,
    dto: UpdateDatasetDto,
  ) {
    await this.findOneOrThrow(id, organizationId);

    return this.prisma.dataset.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.tags !== undefined && { tags: dto.tags }),
      },
    });
  }

  async clone(
    id: string,
    organizationId: string,
    userId: string,
    newName?: string,
  ) {
    const source = await this.findOneOrThrow(id, organizationId);

    // Create new dataset with same metadata
    const clone = await this.prisma.dataset.create({
      data: {
        name: newName ?? `${source.name} (copy)`,
        description: source.description,
        organizationId,
        createdById: userId,
        format: source.format,
        tags: source.tags,
        metadata: source.metadata as Prisma.InputJsonValue,
        status: 'PENDING',
      },
    });

    // Copy rows in batches
    const BATCH_SIZE = 500;
    let offset = 0;
    let rowCount = 0;

    // eslint-disable-next-line no-constant-condition
    while (true) {
      const rows = await this.prisma.datasetRow.findMany({
        where: { datasetId: id },
        orderBy: { rowIndex: 'asc' },
        skip: offset,
        take: BATCH_SIZE,
      });

      if (rows.length === 0) break;

      await this.prisma.datasetRow.createMany({
        data: rows.map((row) => ({
          datasetId: clone.id,
          rowIndex: row.rowIndex,
          prompt: row.prompt,
          promptType: row.promptType,
          context: row.context,
          expectedOutput: row.expectedOutput,
          metadata: row.metadata as Prisma.InputJsonValue,
          tags: row.tags,
        })),
        skipDuplicates: true,
      });

      rowCount += rows.length;
      offset += BATCH_SIZE;
    }

    await this.prisma.dataset.update({
      where: { id: clone.id },
      data: { status: 'READY', rowCount },
    });

    this.logger.log(`Dataset ${id} cloned to ${clone.id}: ${rowCount} rows`);
    return clone;
  }

  async createVersion(
    datasetId: string,
    organizationId: string,
    userId: string,
    fileUrl: string,
    rowCount: number,
    changelog?: string,
  ) {
    const dataset = await this.findOneOrThrow(datasetId, organizationId);
    const newVersion = dataset.version + 1;

    const version = await this.prisma.datasetVersion.create({
      data: {
        datasetId,
        version: newVersion,
        rowCount,
        fileUrl,
        changelog: changelog ?? null,
        createdById: userId,
      },
    });

    await this.prisma.dataset.update({
      where: { id: datasetId },
      data: { version: newVersion },
    });

    return version;
  }

async getVersions(datasetId: string, organizationId: string) {
    await this.findOneOrThrow(datasetId, organizationId);

    return this.prisma.datasetVersion.findMany({
      where: { datasetId },
      orderBy: { version: 'desc' },
    });
  }

  async getVersionDiff(
    datasetId: string,
    organizationId: string,
    baseVersion: number,
    currentVersion: number,
  ): Promise<DatasetVersionDiff> {
    await this.findOneOrThrow(datasetId, organizationId);

    const [base, current] = await Promise.all([
      this.prisma.datasetVersion.findFirst({ where: { datasetId, version: baseVersion } }),
      this.prisma.datasetVersion.findFirst({ where: { datasetId, version: currentVersion } }),
    ]);

    if (!base || !current) {
      throw new NotFoundException('One or both versions not found');
    }

    const [baseBuffer, currentBuffer] = await Promise.all([
      this.storage.download(base.fileUrl),
      this.storage.download(current.fileUrl),
    ]);

    const baseRows = parseDatasetRows(baseBuffer);
    const currentRows = parseDatasetRows(currentBuffer);

    const keyOf = (row: ParsedRow, index: number) => (row.rowIndex ?? index);

    const baseByKey = new Map(baseRows.map((row, index) => [keyOf(row, index), row]));
    const currentByKey = new Map(currentRows.map((row, index) => [keyOf(row, index), row]));

    const changed = (b: ParsedRow, c: ParsedRow) =>
      rowPrompt(b) !== rowPrompt(c) ||
      String(b.context ?? '') !== String(c.context ?? '') ||
      (rowExpectedOutput(b) ?? '') !== (rowExpectedOutput(c) ?? '');

    const keys = Array.from(new Set([...baseByKey.keys(), ...currentByKey.keys()])).sort(
      (a, b) => a - b,
    );

    const rows: DatasetVersionDiff['rows'] = [];
    let addedCount = 0;
    let removedCount = 0;
    let modifiedCount = 0;

    for (const key of keys) {
      const baseRow = baseByKey.get(key);
      const currentRow = currentByKey.get(key);

      if (baseRow && !currentRow) {
        removedCount += 1;
        rows.push({
          rowIndex: key,
          prompt: rowPrompt(baseRow),
          promptType: rowPromptType(baseRow.type) as unknown as PromptType,
          status: 'REMOVED',
        });
      } else if (!baseRow && currentRow) {
        addedCount += 1;
        rows.push({
          rowIndex: key,
          prompt: rowPrompt(currentRow),
          promptType: rowPromptType(currentRow.type) as unknown as PromptType,
          status: 'ADDED',
        });
      } else if (baseRow && currentRow && changed(baseRow, currentRow)) {
        modifiedCount += 1;
        rows.push({
          rowIndex: key,
          prompt: rowPrompt(currentRow),
          promptType: rowPromptType(currentRow.type) as unknown as PromptType,
          status: 'MODIFIED',
        });
      }
    }

    return {
      baseVersion,
      currentVersion,
      addedCount,
      removedCount,
      modifiedCount,
      rows,
    };
  }

  private async findOneOrThrow(id: string, organizationId: string) {
    const dataset = await this.prisma.dataset.findFirst({
      where: { id, organizationId },
      include: { _count: { select: { rows: true, tasks: true } } },
    });

    if (!dataset) {
      throw new NotFoundException(`Dataset ${id} not found`);
    }

    return dataset;
  }
}
