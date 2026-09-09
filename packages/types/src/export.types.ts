export enum ExportFormat {
  JSONL = 'JSONL',
  CSV = 'CSV',
  JSON = 'JSON',
}

export enum ExportStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  READY = 'READY',
  FAILED = 'FAILED',
}

export interface Export {
  id: string;
  organizationId: string;
  taskId: string | null;
  requestedById: string;
  format: string;
  status: ExportStatus | string;
  fileUrl: string | null;
  fileSize: number | null;
  filters: Record<string, unknown>;
  rowCount: number | null;
  errorMessage: string | null;
  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  requestedBy?: { name: string; email: string };
  task?: { name: string };
}