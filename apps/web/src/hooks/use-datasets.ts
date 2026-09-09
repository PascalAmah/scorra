import { useMutation, useQuery } from '@tanstack/react-query';

import type { Dataset } from '@scorra/types';

import { api } from '@/lib/api';
import { queryKeys, useInvalidate } from '@/hooks/query-keys';

export function useDatasets(params: { page?: number; limit?: number; search?: string } = {}) {
  return useQuery({
    queryKey: queryKeys.datasets(params),
    queryFn: () => api.getDatasets(params),
  });
}

export function useDataset(id: string, options?: { onSuccess?: (data: Dataset) => void }) {
  return useQuery({
    queryKey: queryKeys.dataset(id),
    queryFn: () => api.getDataset(id),
    enabled: Boolean(id),
    refetchInterval: (query) =>
      (query.state.data as Pick<Dataset, 'status'> | undefined)?.status === 'PROCESSING'
        ? 3000
        : false,
    ...options,
  });
}

export function useDatasetRows(
  id: string,
  params: { page?: number; limit?: number } = { page: 1, limit: 100 },
  options?: { refetchInterval?: number | false },
) {
  return useQuery({
    queryKey: queryKeys.datasetRows(id, params),
    queryFn: () => api.getDatasetRows(id, params),
    enabled: Boolean(id),
    ...options,
  });
}

export function useDatasetVersions(id: string) {
  return useQuery({
    queryKey: queryKeys.datasetVersions(id),
    queryFn: () => api.getDatasetVersions(id),
    enabled: Boolean(id),
  });
}

export function useDatasetVersionDiff(id: string, baseVersion?: number, currentVersion?: number) {
  return useQuery({
    queryKey: queryKeys.datasetVersionDiff(id, baseVersion, currentVersion),
    queryFn: () => api.getDatasetVersionDiff(id, baseVersion!, currentVersion!),
    enabled: Boolean(id && baseVersion && currentVersion && baseVersion !== currentVersion),
  });
}

export function useCreateDataset() {
  const { invalidateDatasets } = useInvalidate();
  return useMutation({
    mutationFn: api.createDataset,
    onSuccess: invalidateDatasets,
  });
}

export function useUploadDatasetFile(id: string) {
  const { invalidateDataset } = useInvalidate();
  return useMutation({
    mutationFn: (file: File) => api.uploadDatasetFile(id, file),
    onSuccess: () => invalidateDataset(id),
  });
}

export function useCloneDataset(id: string) {
  const { invalidateDatasets } = useInvalidate();
  return useMutation({
    mutationFn: () => api.cloneDataset(id),
    onSuccess: invalidateDatasets,
  });
}

export function useUpdateDataset(id: string) {
  const { invalidateDataset } = useInvalidate();
  return useMutation({
    mutationFn: (data: { name?: string; description?: string; tags?: string[] }) =>
      api.updateDataset(id, data),
    onSuccess: () => invalidateDataset(id),
  });
}

export function useArchiveDataset(id: string) {
  const { invalidateDataset } = useInvalidate();
  return useMutation({
    mutationFn: () => api.archiveDataset(id),
    onSuccess: () => invalidateDataset(id),
  });
}

export function useDeleteDataset(id: string) {
  const { invalidateDatasets } = useInvalidate();
  return useMutation({
    mutationFn: () => api.deleteDataset(id),
    onSuccess: invalidateDatasets,
  });
}

export function useGenerateDatasetResponses(id: string) {
  const { invalidateDataset } = useInvalidate();
  return useMutation({
    mutationFn: () => api.generateDatasetResponses(id),
    onSuccess: () => invalidateDataset(id),
  });
}
