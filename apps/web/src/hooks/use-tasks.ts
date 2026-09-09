import { useMutation, useQuery } from '@tanstack/react-query';

import { api } from '@/lib/api';
import { queryKeys, useInvalidate } from '@/hooks/query-keys';

export function useTasks(params: { page?: number; limit?: number; search?: string } = {}) {
  return useQuery({
    queryKey: queryKeys.tasks(params),
    queryFn: () => api.getTasks(params),
  });
}

export function useTask(id: string) {
  return useQuery({
    queryKey: queryKeys.task(id),
    queryFn: () => api.getTask(id),
    enabled: Boolean(id),
  });
}

export function useTaskProgress(id: string) {
  return useQuery({
    queryKey: queryKeys.taskProgress(id),
    queryFn: () => api.getTaskProgress(id),
    enabled: Boolean(id),
    staleTime: 0,
  });
}

export function useTaskResults(
  id: string,
  params: { page?: number; limit?: number } = { limit: 100 },
) {
  return useQuery({
    queryKey: queryKeys.taskResults(id, params),
    queryFn: () => api.getTaskResults(id, params),
    enabled: Boolean(id),
  });
}

export function useTaskAgreement(id: string) {
  return useQuery({
    queryKey: queryKeys.taskAgreement(id),
    queryFn: () => api.getTaskAgreement(id),
    enabled: Boolean(id),
    retry: false,
  });
}

export function useTaskScores(id: string) {
  return useQuery({
    queryKey: queryKeys.taskScores(id),
    queryFn: () => api.getTaskScores(id),
    enabled: Boolean(id),
    retry: false,
  });
}

export function useComparisonResults(id: string) {
  return useQuery({
    queryKey: queryKeys.comparisonResults(id),
    queryFn: () => api.getComparisonResults(id),
    enabled: Boolean(id),
  });
}

export function useRankingResults(id: string) {
  return useQuery({
    queryKey: queryKeys.rankingResults(id),
    queryFn: () => api.getRankingResults(id),
    enabled: Boolean(id),
  });
}

export function useActivateTask(id: string) {
  const { invalidateTask } = useInvalidate();
  return useMutation({
    mutationFn: () => api.activateTask(id),
    onSuccess: () => invalidateTask(id),
  });
}

export function usePauseTask(id: string) {
  const { invalidateTask } = useInvalidate();
  return useMutation({
    mutationFn: () => api.pauseTask(id),
    onSuccess: () => invalidateTask(id),
  });
}

export function useCreateTask() {
  const { invalidateTasks } = useInvalidate();
  return useMutation({
    mutationFn: api.createTask,
    onSuccess: invalidateTasks,
  });
}
