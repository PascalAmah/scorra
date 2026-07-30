export enum QueueName {
  DATASET_PROCESSING = 'dataset-processing',
  AI_EVALUATION = 'ai-evaluation',
  EXPORT_GENERATION = 'export-generation',
  EMAIL_NOTIFICATIONS = 'email-notifications',
  ANALYTICS_COMPUTATION = 'analytics-computation',
  MODEL_INFERENCE = 'model-inference',
}

export enum JobStatus {
  WAITING = 'waiting',
  ACTIVE = 'active',
  COMPLETED = 'completed',
  FAILED = 'failed',
  DELAYED = 'delayed',
  PAUSED = 'paused',
}

// Dataset processing job
export interface DatasetProcessingJobData {
  datasetId: string;
  organizationId: string;
  fileUrl: string;
  format: string;
  uploadedById: string;
}

// AI evaluation job
export interface AIEvaluationJobData {
  evaluationId: string;
  datasetRowId: string;
  modelResponse: string;
  prompt: string;
  context: string | null;
  expectedOutput: string | null;
  scoringCriteria: string[];
  organizationId: string;
}

// Export generation job
export interface ExportGenerationJobData {
  exportId: string;
  taskId: string;
  organizationId: string;
  format: 'JSONL' | 'CSV' | 'JSON';
  filters: Record<string, unknown>;
  requestedById: string;
}

// Analytics computation job
export interface AnalyticsComputationJobData {
  organizationId: string;
  taskId?: string;
  computationType: 'AGREEMENT_METRICS' | 'SCORE_TRENDS' | 'EVALUATOR_METRICS' | 'FULL_REFRESH';
}

// Model inference job
export interface ModelInferenceJobData {
  datasetRowId: string;
  prompt: string;
  modelConfigs: ModelConfig[];
  taskId: string;
  organizationId: string;
}

export interface ModelConfig {
  provider: 'openai' | 'anthropic' | 'custom';
  modelId: string;
  modelName: string;
  temperature?: number;
  maxTokens?: number;
  systemPrompt?: string;
  apiKey?: string;
}

export interface JobResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  processingTimeMs: number;
}
