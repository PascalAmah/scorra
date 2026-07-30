export enum EvaluationStatus {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  SKIPPED = 'SKIPPED',
  FLAGGED = 'FLAGGED',
}

export enum EvaluationType {
  SINGLE = 'SINGLE',
  PAIRWISE = 'PAIRWISE',
  RANKING = 'RANKING',
}

export enum ScoreDimension {
  ACCURACY = 'ACCURACY',
  RELEVANCE = 'RELEVANCE',
  FLUENCY = 'FLUENCY',
  COHERENCE = 'COHERENCE',
  HELPFULNESS = 'HELPFULNESS',
  SAFETY = 'SAFETY',
  FACTUALITY = 'FACTUALITY',
  CREATIVITY = 'CREATIVITY',
  CONCISENESS = 'CONCISENESS',
  CUSTOM = 'CUSTOM',
}

export interface EvaluationTask {
  id: string;
  organizationId: string;
  datasetId: string;
  name: string;
  description: string | null;
  type: EvaluationType;
  scoringCriteria: ScoringCriteria[];
  assignedEvaluatorIds: string[];
  status: 'DRAFT' | 'ACTIVE' | 'PAUSED' | 'COMPLETED' | 'ARCHIVED';
  dueDate: Date | null;
  createdById: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ScoringCriteria {
  dimension: ScoreDimension;
  label: string;
  description: string;
  minScore: number;
  maxScore: number;
  weight: number;
  required: boolean;
}

export interface Evaluation {
  id: string;
  taskId: string;
  datasetRowId: string;
  evaluatorId: string;
  status: EvaluationStatus;
  scores: EvaluationScore[];
  overallScore: number | null;
  comment: string | null;
  tags: string[];
  timeSpentSeconds: number | null;
  aiSuggestions: AISuggestion | null;
  submittedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface EvaluationScore {
  dimension: ScoreDimension;
  label: string;
  score: number;
  confidence: number | null;
  note: string | null;
}

export interface AISuggestion {
  suggestedScores: Partial<Record<ScoreDimension, number>>;
  hallucinationDetected: boolean;
  hallucinationDetails: string | null;
  qualityLabel: 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR' | null;
  reasoning: string | null;
  confidence: number;
  generatedAt: Date;
}

export interface SubmitEvaluationRequest {
  taskId: string;
  datasetRowId: string;
  scores: EvaluationScore[];
  overallScore?: number;
  comment?: string;
  tags?: string[];
  timeSpentSeconds?: number;
}

export interface ModelResponse {
  id: string;
  datasetRowId: string;
  modelId: string;
  modelName: string;
  provider: string;
  response: string;
  promptTokens: number | null;
  completionTokens: number | null;
  latencyMs: number | null;
  metadata: Record<string, unknown>;
  createdAt: Date;
}
