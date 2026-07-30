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
import { CreateDatasetDto } from './dto/create-dataset.dto';
import { CreatePromptDto } from './dto/create-prompt.dto';
import { UpdateDatasetDto } from './dto/update-dataset.dto';
import { PaginationDto, buildPaginationMeta } from '../../common/dto/pagination.dto';
import { QueueName, DatasetProcessingJobData } from '@scorra/types';
import { Prisma } from '@prisma/client';

@Injectable()
export class DatasetsService {
  private readonly logger = new Logger(DatasetsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    @InjectQueue(QueueName.DATASET_PROCESSING)
    private readonly datasetQueue: Queue,
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

    await this.prisma.dataset.update({
      where: { id: datasetId },
      data: { fileUrl, status: 'PROCESSING' },
    });

    // Enqueue processing job
    const jobData: DatasetProcessingJobData = {
      datasetId,
      organizationId,
      fileUrl, // storage key — used by worker to download
      format: dataset.format,
      uploadedById: userId,
    };

    await this.datasetQueue.add('process-dataset', jobData, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 3000 },
    });

    this.logger.log(`Dataset ${datasetId} queued for processing`);
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

  private async findOneOrThrow(id: string, organizationId: string) {
    const dataset = await this.prisma.dataset.findFirst({
      where: { id, organizationId },
    });

    if (!dataset) {
      throw new NotFoundException(`Dataset ${id} not found`);
    }

    return dataset;
  }
}
