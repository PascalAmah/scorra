import { useMutation, useQuery } from '@tanstack/react-query';

import { api } from '@/lib/api';
import { queryKeys, useInvalidate } from '@/hooks/query-keys';

type SubmitEvaluationArgs = Parameters<typeof api.submitEvaluation>[0];
type SubmitComparisonArgs = Parameters<typeof api.submitComparison>[0];
type SubmitRankingArgs = Parameters<typeof api.submitRanking>[0];

export function useNextEvaluation(id: string) {
  return useQuery({
    queryKey: queryKeys.nextEvaluation(id),
    queryFn: () => api.getNextEvalItem(id),
    enabled: Boolean(id) && api.isAuthenticated,
    refetchOnWindowFocus: false,
  });
}

export function useNextComparison(id: string) {
  return useQuery({
    queryKey: queryKeys.nextComparison(id),
    queryFn: () => api.getNextComparison(id),
    enabled: Boolean(id) && api.isAuthenticated,
    refetchOnWindowFocus: false,
  });
}

export function useNextRanking(id: string) {
  return useQuery({
    queryKey: queryKeys.nextRanking(id),
    queryFn: () => api.getNextRanking(id),
    enabled: Boolean(id) && api.isAuthenticated,
    refetchOnWindowFocus: false,
  });
}

export function useSubmitEvaluation() {
  const { invalidateTask, invalidateWorkflows } = useInvalidate();
  return useMutation({
    mutationFn: (data: SubmitEvaluationArgs) => api.submitEvaluation(data),
    onSuccess: (_data, vars) => {
      invalidateTask(vars.taskId);
      invalidateWorkflows(vars.taskId);
    },
  });
}

export function useSubmitComparison() {
  const { invalidateTask, invalidateWorkflows } = useInvalidate();
  return useMutation({
    mutationFn: (data: SubmitComparisonArgs) => api.submitComparison(data),
    onSuccess: (_data, vars) => {
      invalidateTask(vars.taskId);
      invalidateWorkflows(vars.taskId);
    },
  });
}

export function useSubmitRanking() {
  const { invalidateTask, invalidateWorkflows } = useInvalidate();
  return useMutation({
    mutationFn: (data: SubmitRankingArgs) => api.submitRanking(data),
    onSuccess: (_data, vars) => {
      invalidateTask(vars.taskId);
      invalidateWorkflows(vars.taskId);
    },
  });
}

export function useRequestAISuggestions() {
  return useMutation({ mutationFn: api.requestAISuggestions });
}
