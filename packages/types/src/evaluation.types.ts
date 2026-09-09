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

export type EvaluationTaskStatus = 'DRAFT' | 'ACTIVE' | 'PAUSED' | 'COMPLETED' | 'ARCHIVED';

export interface EvaluationTask {
  id: string;
  organizationId: string;
  datasetId: string;
  name: string;
  description: string | null;
  type: EvaluationType;
  scoringCriteria: ScoringCriteria[];
  assignedEvaluatorIds: string[];
  status: EvaluationTaskStatus;
  dueDate: Date | null;
  createdById: string;
  createdAt: Date;
  updatedAt: Date;
  dataset?: { id: string; name: string; rowCount: number };
  createdBy?: { id: string; name: string };
  assignments?: Array<{ id: string; evaluatorId: string; assignedAt: Date }>;
  _count?: { evaluations?: number; assignments?: number; comparisons?: number };
  myCounts?: { evaluations: number; comparisons: number; rankings: number };
  /** Number of DISTINCT dataset rows with a COMPLETED evaluation/comparison (org-wide). */
  completedRows?: number;
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
  evaluator?: { id: string; name: string; email: string };
  datasetRow?: { id: string; rowIndex: number; prompt: string };
}

export interface EvaluationScore {
  dimension: ScoreDimension;
  label: string;
  score: number;
  confidence: number | null;
  note: string | null;
}

export interface AISuggestion {
  suggestedScores: Record<string, number>;
  /** Free-text explanation per scored dimension, when available. */
  dimensionExplanations?: Record<string, string> | null;
  hallucinationDetected: boolean;
  hallucinationDetails: string | null;
  qualityLabel: 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR' | null;
  reasoning: string | null;
  confidence: number;
  generatedAt: Date;
  tokensUsed: number;
  latencyMs: number;
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

/** Aggregate progress for an evaluation task. */
export interface TaskProgress {
  taskId: string;
  totalRows: number;
  completedEvaluations: number;
  pendingEvaluations: number;
  assignments: number;
  completionRate: number;
  /** Count of items the requesting evaluator has completed for this task, per task type. */
  myCompleted?: number;
}

/** Index signature used to track per-dimension scores on the evaluate screen. */
export interface ScoreState {
  [dimension: string]: number;
}

/** Payload for the next SINGLE-scoring item in a task workflow. */
export interface NextEvaluationItem {
  completed: boolean;
  message?: string;
  evaluation?: {
    id: string;
    status: string;
    aiSuggestions?: AISuggestion | null;
  };
  datasetRow?: {
    id: string;
    rowIndex: number;
    prompt: string;
    context: string | null;
    expectedOutput: string | null;
    modelResponses: ModelResponse[];
  };
  task?: {
    id: string;
    name: string;
    type: EvaluationType;
    scoringCriteria: ScoringCriteria[];
  };
}
