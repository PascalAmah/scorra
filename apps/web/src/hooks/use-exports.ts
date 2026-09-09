import { useMutation, useQuery } from '@tanstack/react-query';

import { api } from '@/lib/api';
import { queryKeys, useInvalidate } from '@/hooks/query-keys';

export function useExports() {
  return useQuery({
    queryKey: queryKeys.exports(),
    queryFn: () => api.getExports(),
    enabled: api.isAuthenticated,
  });
}

export function useRequestExport() {
  const { invalidateExports } = useInvalidate();
  return useMutation({
    mutationFn: api.requestExport,
    onSuccess: invalidateExports,
  });
}