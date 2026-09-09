import { useQuery } from '@tanstack/react-query';

import { api } from '@/lib/api';
import { queryKeys } from '@/hooks/query-keys';

export function useUsers() {
  return useQuery({
    queryKey: queryKeys.users(),
    queryFn: () => api.getUsers(),
  });
}
