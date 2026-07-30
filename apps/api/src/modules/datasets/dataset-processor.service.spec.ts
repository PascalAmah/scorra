import { Test, TestingModule } from '@nestjs/testing';
import { DatasetProcessorService } from './dataset-processor.service';
import { PrismaService } from '../../prisma/prisma.service';
import { StorageService } from '../../common/services/storage.service';

describe('DatasetProcessorService', () => {
  let service: DatasetProcessorService;
  let prisma: {
    dataset: { update: jest.Mock };
    datasetRow: { createMany: jest.Mock };
  };
  let storage: { download: jest.Mock };

  const datasetId = 'ds-1';
  const fileUrl = 'datasets/ds-1/v1/test.csv';

  beforeEach(async () => {
    prisma = {
      dataset: { update: jest.fn() },
      datasetRow: { createMany: jest.fn() },
    };
    storage = { download: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DatasetProcessorService,
        { provide: PrismaService, useValue: prisma },
        { provide: StorageService, useValue: storage },
      ],
    }).compile();

    service = module.get<DatasetProcessorService>(DatasetProcessorService);
  });

  describe('processDataset — CSV', () => {
    it('should parse CSV and insert rows', async () => {
      const csvContent = `prompt,type,context,expected_output\nWhat is AI?,COMPLETION,tech,Artificial Intelligence\nExplain ML,INSTRUCTION,ml,Machine Learning explanation`;
      storage.download.mockResolvedValue(Buffer.from(csvContent));

      prisma.datasetRow.createMany.mockResolvedValue({ count: 2 });
      prisma.dataset.update.mockResolvedValue({});

      const result = await service.processDataset({
        datasetId,
        organizationId: 'org-1',
        fileUrl,
        format: 'CSV',
        uploadedById: 'user-1',
      });

      expect(result.rowCount).toBe(2);
      expect(prisma.datasetRow.createMany).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.arrayContaining([
            expect.objectContaining({
              prompt: 'What is AI?',
              promptType: 'COMPLETION',
              context: 'tech',
              expectedOutput: 'Artificial Intelligence',
              datasetId,
            }),
            expect.objectContaining({
              prompt: 'Explain ML',
              promptType: 'INSTRUCTION',
              context: 'ml',
              expectedOutput: 'Machine Learning explanation',
              datasetId,
            }),
          ]),
        }),
      );
      expect(prisma.dataset.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: datasetId },
          data: expect.objectContaining({ status: 'READY', rowCount: 2 }),
        }),
      );
    });

    it('should handle empty CSV', async () => {
      storage.download.mockResolvedValue(Buffer.from('prompt,type\n'));

      const result = await service.processDataset({
        datasetId,
        organizationId: 'org-1',
        fileUrl,
        format: 'CSV',
        uploadedById: 'user-1',
      });

      expect(result.rowCount).toBe(0);
    });
  });

  describe('processDataset — JSON', () => {
    it('should parse JSON array', async () => {
      const jsonContent = JSON.stringify([
        { prompt: 'Test 1', type: 'CHAT' },
        { prompt: 'Test 2', type: 'COMPLETION' },
      ]);
      storage.download.mockResolvedValue(Buffer.from(jsonContent));

      prisma.datasetRow.createMany.mockResolvedValue({ count: 2 });
      prisma.dataset.update.mockResolvedValue({});

      const result = await service.processDataset({
        datasetId,
        organizationId: 'org-1',
        fileUrl,
        format: 'JSON',
        uploadedById: 'user-1',
      });

      expect(result.rowCount).toBe(2);
    });

    it('should parse a single JSON object', async () => {
      const jsonContent = JSON.stringify({ prompt: 'Single test' });
      storage.download.mockResolvedValue(Buffer.from(jsonContent));

      prisma.datasetRow.createMany.mockResolvedValue({ count: 1 });
      prisma.dataset.update.mockResolvedValue({});

      const result = await service.processDataset({
        datasetId,
        organizationId: 'org-1',
        fileUrl,
        format: 'JSON',
        uploadedById: 'user-1',
      });

      expect(result.rowCount).toBe(1);
    });
  });

  describe('processDataset — JSONL', () => {
    it('should parse JSONL content', async () => {
      const jsonlContent =
        '{"prompt": "Line 1"}\n{"prompt": "Line 2"}\n{"prompt": "Line 3"}\n';
      storage.download.mockResolvedValue(Buffer.from(jsonlContent));

      prisma.datasetRow.createMany.mockResolvedValue({ count: 3 });
      prisma.dataset.update.mockResolvedValue({});

      const result = await service.processDataset({
        datasetId,
        organizationId: 'org-1',
        fileUrl,
        format: 'JSONL',
        uploadedById: 'user-1',
      });

      expect(result.rowCount).toBe(3);
    });
  });

  describe('processDataset — failure', () => {
    it('should mark dataset as FAILED on error', async () => {
      storage.download.mockRejectedValue(new Error('File not found'));

      await expect(
        service.processDataset({
          datasetId,
          organizationId: 'org-1',
          fileUrl,
          format: 'CSV',
          uploadedById: 'user-1',
        }),
      ).rejects.toThrow('File not found');

      expect(prisma.dataset.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: datasetId },
          data: { status: 'FAILED' },
        }),
      );
    });
  });
});
