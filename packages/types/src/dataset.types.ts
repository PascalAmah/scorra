export enum DatasetStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  READY = 'READY',
  FAILED = 'FAILED',
  ARCHIVED = 'ARCHIVED',
}

export enum DatasetFormat {
  CSV = 'CSV',
  JSON = 'JSON',
  JSONL = 'JSONL',
}

export enum PromptType {
  COMPLETION = 'COMPLETION',
  CHAT = 'CHAT',
  INSTRUCTION = 'INSTRUCTION',
  CLASSIFICATION = 'CLASSIFICATION',
  SUMMARIZATION = 'SUMMARIZATION',
  TRANSLATION = 'TRANSLATION',
  CUSTOM = 'CUSTOM',
}

export interface Dataset {
  id: string;
  name: string;
  description: string | null;
  organizationId: string;
  createdById: string;
  status: DatasetStatus;
  format: DatasetFormat;
  version: number;
  rowCount: number;
  fileUrl: string | null;
  metadata: Record<string, unknown>;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface DatasetVersion {
  id: string;
  datasetId: string;
  version: number;
  rowCount: number;
  fileUrl: string;
  changelog: string | null;
  createdById: string;
  createdAt: Date;
}

export interface DatasetRow {
  id: string;
  datasetId: string;
  rowIndex: number;
  prompt: string;
  promptType: PromptType;
  context: string | null;
  expectedOutput: string | null;
  metadata: Record<string, unknown>;
  tags: string[];
  createdAt: Date;
}

export interface CreateDatasetRequest {
  name: string;
  description?: string;
  format: DatasetFormat;
  tags?: string[];
}

export interface CreatePromptRequest {
  datasetId: string;
  prompt: string;
  promptType: PromptType;
  context?: string;
  expectedOutput?: string;
  metadata?: Record<string, unknown>;
  tags?: string[];
}
