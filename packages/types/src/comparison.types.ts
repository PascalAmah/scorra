export enum ComparisonVerdict {
  A_BETTER = 'A_BETTER',
  B_BETTER = 'B_BETTER',
  TIE = 'TIE',
  BOTH_BAD = 'BOTH_BAD',
}

export enum PairwiseComparisonStatus {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  SKIPPED = 'SKIPPED',
}

export interface PairwiseComparison {
  id: string;
  taskId: string;
  datasetRowId: string;
  evaluatorId: string;
  responseAId: string;
  responseBId: string;
  verdict: ComparisonVerdict | null;
  confidenceScore: number | null;
  reasoning: string | null;
  dimensionVerdicts: DimensionVerdict[];
  timeSpentSeconds: number | null;
  status: PairwiseComparisonStatus;
  submittedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  /** Populated when fetched via the admin results endpoint. */
  evaluator?: { name: string; email: string } | null;
  /** Populated when fetched via the admin results endpoint. */
  datasetRow?: { rowIndex: number; prompt: string } | null;
}

export interface DimensionVerdict {
  dimension: string;
  verdict: ComparisonVerdict;
  note: string | null;
}

export interface RankingResult {
  id: string;
  taskId: string;
  datasetRowId: string;
  evaluatorId: string;
  rankings: ModelRanking[];
  comment: string | null;
  submittedAt: Date | null;
  createdAt: Date;
}

export interface ModelRanking {
  responseId: string;
  modelName: string;
  rank: number;
  score: number | null;
}

/** A single ranked response inside a submitted ranking (DB RankingEntry + model name). */
export interface RankingResultEntry {
  id: string;
  responseId: string;
  modelName: string;
  rank: number;
  score: number | null;
}

/** A submitted ranking as returned by the admin task-results endpoint. */
export interface RankingResultItem {
  id: string;
  taskId: string;
  datasetRowId: string;
  evaluatorId: string;
  comment: string | null;
  submittedAt: Date | null;
  createdAt: Date;
  entries: RankingResultEntry[];
  evaluator?: { id: string; name: string; email: string } | null;
  datasetRow?: { id: string; rowIndex: number; prompt: string } | null;
}

export interface SubmitComparisonRequest {
  taskId: string;
  datasetRowId: string;
  responseAId: string;
  responseBId: string;
  verdict: ComparisonVerdict;
  confidenceScore?: number;
  reasoning?: string;
  dimensionVerdicts?: DimensionVerdict[];
  timeSpentSeconds?: number;
}

/** A single response rendered inside a comparison or ranking workflow. */
export interface ResponseView {
  id: string;
  modelName: string;
  response: string;
}

/** Payload for the next PAIRWISE comparison item in a task workflow. */
export interface NextComparison {
  done: boolean;
  message?: string;
  datasetRowId?: string;
  prompt?: string;
  context?: string | null;
  responseA?: ResponseView;
  responseB?: ResponseView;
}

/** A response to be ranked in a RANKING workflow. */
export interface RankedResponse {
  id: string;
  modelName: string;
  response: string;
}

/** Payload for the next RANKING set in a task workflow. */
export interface NextRanking {
  done: boolean;
  message?: string;
  datasetRowId?: string;
  prompt?: string;
  context?: string | null;
  responses?: RankedResponse[];
}
