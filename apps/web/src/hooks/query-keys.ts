import { useQueryClient } from '@tanstack/react-query';

export const queryKeys = {
  datasets: (params: { page?: number; limit?: number; search?: string }) =>
    ['datasets', params] as const,
  dataset: (id: string) => ['dataset', id] as const,
  datasetRows: (id: string, params: { page?: number; limit?: number }) =>
    ['dataset-rows', id, params] as const,
  datasetVersions: (id: string) => ['dataset-versions', id] as const,
  datasetVersionDiff: (id: string, baseVersion?: number, currentVersion?: number) =>
    ['dataset-version-diff', id, baseVersion, currentVersion] as const,
  tasks: (params: { page?: number; limit?: number; search?: string }) =>
    ['tasks', params] as const,
  task: (id: string) => ['task', id] as const,
  taskProgress: (id: string) => ['task-progress', id] as const,
  taskResults: (id: string, params: { page?: number; limit?: number }) =>
    ['task-results', id, params] as const,
  taskAgreement: (id: string) => ['task-agreement', id] as const,
  taskScores: (id: string) => ['task-scores', id] as const,
  comparisonResults: (id: string) => ['comparison-results', id] as const,
  rankingResults: (id: string) => ['ranking-results', id] as const,
  nextEvaluation: (id: string) => ['next-eval', id] as const,
  nextComparison: (id: string) => ['next-comparison', id] as const,
  nextRanking: (id: string) => ['next-ranking', id] as const,
  users: () => ['users'] as const,
  profile: () => ['profile'] as const,
  organizations: () => ['organizations'] as const,
  members: (orgId: string) => ['members', orgId] as const,
  invitations: (orgId: string) => ['invitations', orgId] as const,
  invitation: (token: string) => ['invitation', token] as const,
  dashboardSummary: () => ['dashboard-summary'] as const,
  exports: () => ['exports'] as const,
};

export function useInvalidate() {
  const queryClient = useQueryClient();
  return {
    invalidateDatasets: () => queryClient.invalidateQueries({ queryKey: ['datasets'] }),
    invalidateDataset: (id: string) => {
      queryClient.invalidateQueries({ queryKey: ['dataset', id] });
      queryClient.invalidateQueries({ queryKey: ['dataset-rows', id] });
      queryClient.invalidateQueries({ queryKey: ['dataset-versions', id] });
    },
    invalidateTasks: () => queryClient.invalidateQueries({ queryKey: ['tasks'] }),
    invalidateWorkflows: (taskId: string) => {
      queryClient.invalidateQueries({ queryKey: ['next-eval', taskId] });
      queryClient.invalidateQueries({ queryKey: ['next-comparison', taskId] });
      queryClient.invalidateQueries({ queryKey: ['next-ranking', taskId] });
    },
    invalidateTask: (id: string) => {
      queryClient.invalidateQueries({ queryKey: ['task', id] });
      queryClient.invalidateQueries({ queryKey: ['task-progress', id] });
      queryClient.invalidateQueries({ queryKey: ['task-results', id] });
      queryClient.invalidateQueries({ queryKey: ['task-agreement', id] });
      queryClient.invalidateQueries({ queryKey: ['task-scores', id] });
      queryClient.invalidateQueries({ queryKey: ['comparison-results', id] });
      queryClient.invalidateQueries({ queryKey: ['ranking-results', id] });
    },
    invalidateDashboard: () =>
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] }),
    invalidateMembers: (orgId: string) => {
      queryClient.invalidateQueries({ queryKey: ['members', orgId] });
      queryClient.invalidateQueries({ queryKey: ['invitations', orgId] });
    },
    invalidateExports: () => queryClient.invalidateQueries({ queryKey: ['exports'] }),
  };
}
