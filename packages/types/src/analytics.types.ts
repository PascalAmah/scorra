export interface ModelPerformanceMetrics {
  modelId: string;
  modelName: string;
  provider: string;
  averageScore: number;
  scoreByDimension: Record<string, number>;
  winRate: number;
  lossRate: number;
  tieRate: number;
  hallucinationRate: number;
  totalEvaluations: number;
  evaluationPeriod: DateRange;
}

export interface EvaluatorMetrics {
  evaluatorId: string;
  evaluatorName: string;
  totalEvaluations: number;
  averageTimePerEvaluation: number;
  agreementRate: number;
  consistencyScore: number;
  completionRate: number;
  evaluationPeriod: DateRange;
}

export interface AgreementMetrics {
  taskId: string;
  overallAgreementRate: number;
  fleissKappa: number | null;
  krippendorffsAlpha: number | null;
  pairwiseAgreements: PairwiseAgreement[];
}

export interface PairwiseAgreement {
  evaluatorAId: string;
  evaluatorBId: string;
  agreementRate: number;
  cohensKappa: number | null;
}

export interface ScoreTrend {
  date: string;
  modelId: string;
  modelName: string;
  averageScore: number;
  evaluationCount: number;
}

export interface DashboardSummary {
  totalEvaluations: number;
  completedEvaluations: number;
  pendingEvaluations: number;
  activeEvaluators: number;
  totalDatasets: number;
  totalModels: number;
  averageScoreThisMonth: number;
  hallucinationRateThisMonth: number;
  recentActivity: ActivityItem[];
}

export interface ActivityItem {
  id: string;
  type: 'EVALUATION_SUBMITTED' | 'DATASET_UPLOADED' | 'TASK_CREATED' | 'EXPORT_READY';
  description: string;
  userId: string;
  userName: string;
  createdAt: Date;
}

export interface DateRange {
  from: Date;
  to: Date;
}

export interface AnalyticsQueryParams {
  organizationId: string;
  dateRange?: DateRange;
  modelIds?: string[];
  evaluatorIds?: string[];
  taskIds?: string[];
  groupBy?: 'day' | 'week' | 'month';
}
