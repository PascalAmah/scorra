export enum ComparisonVerdict {
  A_BETTER = 'A_BETTER',
  B_BETTER = 'B_BETTER',
  TIE = 'TIE',
  BOTH_BAD = 'BOTH_BAD',
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
  status: 'PENDING' | 'COMPLETED' | 'SKIPPED';
  submittedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
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
