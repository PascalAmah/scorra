import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { InviteMemberRequest } from '@scorra/types';

import { api } from '@/lib/api';
import { queryKeys } from '@/hooks/query-keys';

export function useOrganizations() {
  return useQuery({
    queryKey: queryKeys.organizations(),
    queryFn: () => api.getOrganizations(),
  });
}

export function useUpdateOrganization(orgId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => api.updateOrganization(orgId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.organizations() });
    },
  });
}

export function useMembers(orgId: string) {
  return useQuery({
    queryKey: queryKeys.members(orgId),
    queryFn: () => api.getMembers(orgId),
    enabled: Boolean(orgId),
  });
}

export function useInviteMember(orgId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: InviteMemberRequest) => api.inviteMember(orgId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.invitations(orgId) });
    },
  });
}

export function useRemoveMember(orgId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => api.removeMember(orgId, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.members(orgId) });
    },
  });
}

export function useChangeMemberRole(orgId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: string }) =>
      api.changeMemberRole(orgId, userId, { role }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.members(orgId) });
    },
  });
}

export function useInvitations(orgId: string) {
  return useQuery({
    queryKey: queryKeys.invitations(orgId),
    queryFn: () => api.getInvitations(orgId),
    enabled: Boolean(orgId),
  });
}

export function useInvitation(token: string | null) {
  return useQuery({
    queryKey: queryKeys.invitation(token ?? ''),
    queryFn: () => api.getInvitation(token!),
    enabled: !!token,
  });
}

export function useResendInvitation(orgId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (invitationId: string) => api.resendInvitation(orgId, invitationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.invitations(orgId) });
    },
  });
}

export function useRevokeInvitation(orgId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (invitationId: string) => api.revokeInvitation(orgId, invitationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.invitations(orgId) });
    },
  });
}