import { Test, TestingModule } from '@nestjs/testing';
import { DatasetsService } from './datasets.service';
import { PrismaService } from '../../prisma/prisma.service';
import { StorageService } from '../../common/services/storage.service';
import { AiService } from '../ai/ai.service';
import { getQueueToken } from '@nestjs/bull';
import { QueueName, DatasetFormat } from '@scorra/types';
import { NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';

describe('DatasetsService', () => {
  let service: DatasetsService;
  let prisma: {
    dataset: {
      create: jest.Mock;
      findFirst: jest.Mock;
      findMany: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
      count: jest.Mock;
    };
    datasetRow: {
      findMany: jest.Mock;
      findFirst: jest.Mock;
      create: jest.Mock;
      createMany: jest.Mock;
      count: jest.Mock;
    };
    datasetVersion: {
      create: jest.Mock;
      findMany: jest.Mock;
    };
    evaluationTask: { deleteMany: jest.Mock };
  };
  let storage: { upload: jest.Mock; download: jest.Mock; delete: jest.Mock; getUrl: jest.Mock };
  let queue: { add: jest.Mock };
  let aiService: {
    isGenerationConfigured: jest.Mock;
    getGenerationInfo: jest.Mock;
    generateResponse: jest.Mock;
  };

  const orgId = 'org-1';
  const userId = 'user-1';

  const mockDataset = {
    id: 'ds-1',
    name: 'Test Dataset',
    description: 'A test dataset',
    organizationId: orgId,
    createdById: userId,
    format: 'CSV',
    status: 'READY',
    version: 1,
    rowCount: 10,
    fileUrl: 'datasets/ds-1/v1/file.csv',
    tags: ['qa'],
    metadata: {},
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    prisma = {
      dataset: {
        create: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        count: jest.fn(),
      },
      datasetRow: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        createMany: jest.fn(),
        count: jest.fn(),
      },
      datasetVersion: {
        create: jest.fn(),
        findMany: jest.fn(),
      },
      evaluationTask: { deleteMany: jest.fn() },
    };

    storage = {
      upload: jest.fn(),
      download: jest.fn(),
      delete: jest.fn(),
      getUrl: jest.fn(),
    };

    queue = { add: jest.fn() };

    aiService = {
      isGenerationConfigured: jest.fn().mockReturnValue(true),
      getGenerationInfo: jest
        .fn()
        .mockReturnValue({ provider: 'openai', modelId: 'gpt-4o', modelName: 'gpt-4o' }),
      generateResponse: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DatasetsService,
        { provide: PrismaService, useValue: prisma },
        { provide: StorageService, useValue: storage },
        { provide: AiService, useValue: aiService },
        { provide: getQueueToken(QueueName.DATASET_PROCESSING), useValue: queue },
        { provide: getQueueToken(QueueName.MODEL_INFERENCE), useValue: queue },
      ],
    }).compile();

    service = module.get<DatasetsService>(DatasetsService);
  });

  describe('create', () => {
    it('should create a dataset with PENDING status', async () => {
      prisma.dataset.create.mockResolvedValue(mockDataset);

      const result = await service.create(orgId, userId, {
        name: 'Test Dataset',
        format: DatasetFormat.CSV,
        description: 'A test dataset',
        tags: ['qa'],
      });

      expect(prisma.dataset.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          name: 'Test Dataset',
          organizationId: orgId,
          createdById: userId,
          format: 'CSV',
          status: 'PENDING',
        }),
      });
      expect(result).toEqual(mockDataset);
    });
  });

  describe('findAll', () => {
    it('should return paginated datasets with search', async () => {
      prisma.dataset.findMany.mockResolvedValue([mockDataset]);
      prisma.dataset.count.mockResolvedValue(1);

      const result = await service.findAll(orgId, {
        page: 1,
        limit: 20,
        search: 'test',
      } as any);

      expect(prisma.dataset.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            organizationId: orgId,
            OR: expect.any(Array),
          }),
        }),
      );
      expect(result.data).toHaveLength(1);
      expect(result.pagination.total).toBe(1);
    });
  });

  describe('findOne', () => {
    it('should return a dataset by id', async () => {
      prisma.dataset.findFirst.mockResolvedValue(mockDataset);

      const result = await service.findOne('ds-1', orgId);
      expect(result).toEqual(mockDataset);
    });

    it('should throw NotFoundException when not found', async () => {
      prisma.dataset.findFirst.mockResolvedValue(null);

      await expect(service.findOne('ds-999', orgId)).rejects.toThrow(NotFoundException);
    });
  });

  describe('uploadFile', () => {
    const file = {
      originalname: 'test.csv',
      buffer: Buffer.from('prompt\ntest1'),
      mimetype: 'text/csv',
    } as Express.Multer.File;

    it('should upload file and queue processing', async () => {
      prisma.dataset.findFirst.mockResolvedValue(mockDataset);
      storage.upload.mockResolvedValue('datasets/ds-1/v1/test.csv');

      const result = await service.uploadFile('ds-1', orgId, userId, file);

      expect(storage.upload).toHaveBeenCalled();
      expect(prisma.dataset.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'ds-1' },
          data: expect.objectContaining({ status: 'PROCESSING' }),
        }),
      );
      expect(queue.add).toHaveBeenCalledWith(
        'process-dataset',
        expect.objectContaining({ datasetId: 'ds-1' }),
        expect.any(Object),
      );
      expect(result.datasetId).toBe('ds-1');
    });

    it('should throw if dataset is already processing', async () => {
      prisma.dataset.findFirst.mockResolvedValue({ ...mockDataset, status: 'PROCESSING' });

      await expect(service.uploadFile('ds-1', orgId, userId, file)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('archive', () => {
    it('should archive a dataset', async () => {
      prisma.dataset.findFirst.mockResolvedValue(mockDataset);
      prisma.dataset.update.mockResolvedValue({ ...mockDataset, status: 'ARCHIVED' });

      const result = await service.archive('ds-1', orgId);
      expect(result.status).toBe('ARCHIVED');
    });
  });

  describe('delete', () => {
    it('should delete if user is creator', async () => {
      prisma.dataset.findFirst.mockResolvedValue(mockDataset);

      const result = await service.delete('ds-1', orgId, userId);
      expect(prisma.dataset.delete).toHaveBeenCalledWith({ where: { id: 'ds-1' } });
      expect(result.message).toBe('Dataset deleted');
    });

    it('should throw ForbiddenException if not creator', async () => {
      prisma.dataset.findFirst.mockResolvedValue(mockDataset);

      await expect(service.delete('ds-1', orgId, 'other-user')).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('clone', () => {
    it('should clone a dataset with its rows', async () => {
      prisma.dataset.findFirst.mockResolvedValue(mockDataset);
      prisma.dataset.create.mockResolvedValue({ ...mockDataset, id: 'ds-clone', name: 'Test Dataset (copy)' });
      prisma.datasetRow.findMany
        .mockResolvedValueOnce([{ rowIndex: 0, prompt: 'p1', promptType: 'COMPLETION', context: null, expectedOutput: null, metadata: {}, tags: [] }])
        .mockResolvedValueOnce([]);

      const result = await service.clone('ds-1', orgId, userId);

      expect(prisma.dataset.create).toHaveBeenCalled();
      expect(result.id).toBe('ds-clone');
      expect(result.name).toBe('Test Dataset (copy)');
    });
  });

  describe('getVersions', () => {
    it('should return version history', async () => {
      prisma.dataset.findFirst.mockResolvedValue(mockDataset);
      prisma.datasetVersion.findMany.mockResolvedValue([
        { id: 'v1', datasetId: 'ds-1', version: 1, rowCount: 10, fileUrl: 'url', changelog: null, createdById: userId, createdAt: new Date() },
      ]);

      const result = await service.getVersions('ds-1', orgId);
      expect(result).toHaveLength(1);
    });
  });
});
