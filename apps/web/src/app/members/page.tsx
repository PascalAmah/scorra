'use client';

import { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Search01Icon, Copy01Icon, Tick01Icon, Cancel01Icon } from 'hugeicons-react';
import type { Invitation, OrganizationMember } from '@scorra/types';

import { AppShell } from '@/components/dashboard/shell';
import { Topbar } from '@/components/dashboard/topbar';
import { Button } from '@/components/ui/button';
import { InviteModal } from '@/components/organization/invite-modal';
import { useAuthGuard } from '@/hooks/use-auth-guard';
import { useAuthStore } from '@/store/auth-store';
import { formatDate, formatRelativeTime } from '@/lib/utils';
import {
  useChangeMemberRole,
  useInvitations,
  useMembers,
  useOrganizations,
  useRemoveMember,
  useResendInvitation,
  useRevokeInvitation,
} from '@/hooks/use-organization';

const ROLE_OPTIONS = ['ORG_ADMIN', 'EVALUATOR', 'VIEWER'] as const;

const ROLE_LABELS: Record<string, string> = {
  ORG_ADMIN: 'Org Admin',
  EVALUATOR: 'Evaluator',
  VIEWER: 'Viewer',
};

const FILTERS = ['All', 'Admins', 'Evaluators'] as const;

function memberInitials(name: string) {
  return name
    .split(/\s+/)
    .map((p) => p[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export default function MembersPage() {
  const currentUserId = useAuthStore((s) => s.user?.id);

  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>('All');
  const [inviteOpen, setInviteOpen] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<OrganizationMember | null>(null);
  const [deleteError, setDeleteError] = useState('');
  const [revokeTarget, setRevokeTarget] = useState<Invitation | null>(null);
  const [revokeError, setRevokeError] = useState('');
  const [roleTarget, setRoleTarget] = useState<{
    member: OrganizationMember;
    newRole: string;
  } | null>(null);
  const [roleError, setRoleError] = useState('');

  const { data: orgsData, isPending: loadingOrgs } = useOrganizations();
  const org = (orgsData ?? [])[0] ?? null;

  useAuthGuard();

  const { data: membersData, isPending: membersLoading } = useMembers(org?.id ?? '');
  const members = useMemo(() => membersData ?? [], [membersData]);

  const { data: invitationsData } = useInvitations(org?.id ?? '');
  const pendingInvitations: Invitation[] = (invitationsData ?? []).filter((inv) => !inv.acceptedAt);

  const changeRoleMutation = useChangeMemberRole(org?.id ?? '');
  const removeMutation = useRemoveMember(org?.id ?? '');
  const resendMutation = useResendInvitation(org?.id ?? '');
  const revokeMutation = useRevokeInvitation(org?.id ?? '');

  const filteredMembers = useMemo(() => {
    let list = members;
    if (filter === 'Admins') list = list.filter((m) => m.role === 'ORG_ADMIN');
    if (filter === 'Evaluators') list = list.filter((m) => m.role === 'EVALUATOR');
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (m) =>
          m.user.name.toLowerCase().includes(q) ||
          m.user.email.toLowerCase().includes(q),
      );
    }
    return list;
  }, [members, filter, search]);

  const handleRoleChange = (member: OrganizationMember, newRole: string) => {
    if (member.role === newRole) return;
    setRoleError('');
    setRoleTarget({ member, newRole });
  };

  const handleRoleConfirm = async () => {
    if (!roleTarget) return;
    setRoleError('');
    try {
      await changeRoleMutation.mutateAsync({
        userId: roleTarget.member.userId,
        role: roleTarget.newRole,
      });
      setRoleTarget(null);
      window.location.reload();
    } catch (err) {
      setRoleError(err instanceof Error ? err.message : 'Failed to change role');
    }
  };

  const handleRemove = async () => {
    if (!deleteTarget) return;
    setDeleteError('');
    try {
      await removeMutation.mutateAsync(deleteTarget.userId);
      setDeleteTarget(null);
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'Failed to remove member');
    }
  };

  const handleResend = async (invitationId: string) => {
    try {
      await resendMutation.mutateAsync(invitationId);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to resend');
    }
  };

  const handleRevoke = (invitationId: string) => {
    const inv = pendingInvitations.find((i) => i.id === invitationId);
    if (!inv) return;
    setRevokeError('');
    setRevokeTarget(inv);
  };

  const handleRevokeConfirm = async () => {
    if (!revokeTarget) return;
    setRevokeError('');
    try {
      await revokeMutation.mutateAsync(revokeTarget.id);
      setRevokeTarget(null);
    } catch (err) {
      setRevokeError(err instanceof Error ? err.message : 'Failed to revoke');
    }
  };

  const handleCopyLink = (inv: Invitation) => {
    const link = `${window.location.origin}/accept-invitation?token=${inv.token}`;
    navigator.clipboard.writeText(link);
    setCopiedId(inv.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  if (loadingOrgs) {
    return (
      <AppShell>
        <div className="flex h-[60vh] items-center justify-center">
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-ink-400">Loading…</p>
        </div>
      </AppShell>
    );
  }

  if (!org) {
    return (
      <AppShell>
        <div className="flex h-[60vh] items-center justify-center">
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-ink-400">
            No organization found
          </p>
        </div>
      </AppShell>
    );
  }

  const activeCount = members.filter((m) => m.user.status === 'ACTIVE').length;

  return (
    <AppShell>
      <Topbar
        title="Settings"
        sub={org.name}
      />

      <div className="px-5 pb-14 pt-6 md:px-9">
        {/* Section head */}
        <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-[15px] font-semibold text-ink">Members</h2>
                <p className="mt-0.5 font-mono text-[10.5px] uppercase text-ink-400">
                  {activeCount} ACTIVE · {pendingInvitations.length} PENDING
                </p>
              </div>
              <Button size="sm" onClick={() => setInviteOpen(true)}>
                + Invite member
              </Button>
            </div>

            {/* Toolbar */}
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div className="relative max-w-[240px] flex-1">
                <Search01Icon
                  size={14}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-400"
                />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search members…"
                  className="w-full rounded-sm border border-ink-300 bg-white py-2 pl-9 pr-3 text-[13px] outline-none transition-colors focus:border-ink"
                />
              </div>
              <div className="flex gap-1.5">
                {FILTERS.map((f) => (
                  <button
                    key={f}
                    type="button"
                    onClick={() => setFilter(f)}
                    className={`rounded-full px-3 py-1.5 font-mono text-[11px] transition-colors ${
                      filter === f
                        ? 'border border-ink bg-ink text-white'
                        : 'border border-ink-300 text-ink-500 hover:border-ink-500'
                    }`}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>

            {/* Members table */}
            <div className="overflow-x-auto rounded-2xl border border-ink-200 bg-white">
              {membersLoading ? (
                <p className="px-5 py-12 text-center font-mono text-[11px] text-ink-400">
                  Loading members…
                </p>
              ) : (
                <table className="w-full min-w-[640px] text-left">
                  <thead>
                    <tr className="border-b border-ink-200 text-left font-mono text-[10.5px] uppercase tracking-[0.06em] text-ink-400">
                      <th className="py-3 pl-5 pr-4 font-medium">Member</th>
                      <th className="px-4 py-3 font-medium">Role</th>
                      <th className="px-4 py-3 font-medium">Status</th>
                      <th className="px-4 py-3 font-medium">Joined</th>
                      <th className="py-3 pl-4 pr-5 font-medium" />
                    </tr>
                  </thead>
                  <tbody>
                    {filteredMembers.map((m) => {
                      const isYou = m.userId === currentUserId;
                      return (
                        <tr
                          key={m.id}
                          className="border-b border-ink-100 text-[13px] last:border-b-0 hover:bg-ink-50/50"
                        >
                          <td className="py-3 pl-5 pr-4">
                            <div className="flex items-center gap-3">
                              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-ink-800 font-display text-[11px] font-semibold text-white">
                                {memberInitials(m.user.name)}
                              </span>
                              <div className="min-w-0">
                                <div className="flex items-center gap-1.5">
                                  <span className="truncate font-semibold text-ink">
                                    {m.user.name}
                                  </span>
                                  {isYou && (
                                    <span className="shrink-0 rounded-full border border-ink-300 px-1.5 py-px font-mono text-[9px] uppercase tracking-[0.04em] text-ink-400">
                                      You
                                    </span>
                                  )}
                                </div>
                                <p className="truncate font-mono text-[11px] text-ink-400">
                                  {m.user.email}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            {isYou ? (
                              <span className="font-mono text-[12px] text-ink-500">
                                {ROLE_LABELS[m.role] ?? m.role}
                              </span>
                            ) : (
                              <select
                                value={m.role}
                                onChange={(e) => handleRoleChange(m, e.target.value)}
                                className="rounded border border-ink-200 bg-white px-2 py-1.5 font-mono text-[11.5px] outline-none transition-colors focus:border-ink"
                              >
                                {ROLE_OPTIONS.map((role) => (
                                  <option key={role} value={role}>
                                    {ROLE_LABELS[role]}
                                  </option>
                                ))}
                              </select>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 font-mono text-[10.5px] uppercase tracking-[0.04em] ${
                                m.user.status === 'ACTIVE'
                                  ? 'bg-ink text-white'
                                  : 'border border-ink-300 text-ink-500'
                              }`}
                            >
                              <span
                                className={`inline-block h-1.5 w-1.5 rounded-full ${
                                  m.user.status === 'ACTIVE' ? 'bg-white/60' : 'bg-ink-400'
                                }`}
                              />
                              {m.user.status === 'ACTIVE' ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                          <td className="px-4 py-3 font-mono text-[11.5px] text-ink-500">
                            {m.joinedAt ? formatDate(m.joinedAt) : '—'}
                          </td>
                          <td className="py-3 pl-4 pr-5 text-right">
                            {!isYou && (
                              <button
                                onClick={() => setDeleteTarget(m)}
                                className="font-mono text-[11px] text-ink-400 hover:text-red-500 transition-colors"
                              >
                                Remove
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                    {filteredMembers.length === 0 && (
                      <tr>
                        <td
                          colSpan={5}
                          className="px-5 py-12 text-center font-mono text-[11px] text-ink-400"
                        >
                          No members found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              )}
            </div>

            {/* Pending invitations */}
            {pendingInvitations.length > 0 && (
              <>
                <div className="mb-4 mt-8 flex items-center justify-between">
                  <div>
                    <h2 className="text-[15px] font-semibold text-ink">Pending invitations</h2>
                    <p className="mt-0.5 font-mono text-[10.5px] uppercase text-ink-400">
                      {pendingInvitations.length} SENT, AWAITING RESPONSE
                    </p>
                  </div>
                </div>

                <div className="overflow-hidden rounded-2xl border border-ink-200 bg-white">
                  {pendingInvitations.map((inv, i) => {
                    return (
                      <div
                        key={inv.id}
                        className={`flex items-center gap-3 px-5 py-3.5 ${
                          i > 0 ? 'border-t border-ink-100' : ''
                        }`}
                      >
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-ink-200 bg-ink-100 font-display text-[11px] font-semibold text-ink-500">
                          {inv.email
                            .split('@')[0]
                            .split(/[.\-_]/)
                            .map((p) => p[0])
                            .join('')
                            .toUpperCase()
                            .slice(0, 2)}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="text-[13px] font-medium text-ink">{inv.email}</p>
                          <p className="font-mono text-[11px] text-ink-400">
                            {ROLE_LABELS[inv.role] ?? inv.role} · Sent{' '}
                            {formatRelativeTime(inv.createdAt)} · Expires{' '}
                            {formatDate(inv.expiresAt)}
                          </p>
                        </div>
                        <div className="flex shrink-0 items-center gap-1.5">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleCopyLink(inv)}
                          >
                            {copiedId === inv.id ? (
                              <>
                                <Tick01Icon size={12} />
                                Copied
                              </>
                            ) : (
                              <>
                                <Copy01Icon size={12} />
                                Copy link
                              </>
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleResend(inv.id)}
                            disabled={resendMutation.isPending}
                          >
                            Resend
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRevoke(inv.id)}
                            disabled={revokeMutation.isPending}
                          >
                            Revoke
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
      </div>

      <InviteModal open={inviteOpen} onClose={() => setInviteOpen(false)} />

      <AnimatePresence>
        {deleteTarget && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-ink/60 p-5 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setDeleteTarget(null)}
          >
            <motion.div
              className="w-full max-w-110 overflow-hidden rounded-2xl bg-white shadow-2xl"
              initial={{ opacity: 0, y: 16, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 16, scale: 0.98 }}
              transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start justify-between px-6 pb-2 pt-6">
                <div>
                  <p className="mb-2 flex items-center gap-2 font-mono text-[10.5px] uppercase tracking-[0.12em] text-red-600">
                    <span className="h-1.5 w-1.5 rounded-full border border-red-500" />
                    Danger zone
                  </p>
                  <h2 className="text-[19px] font-semibold">Remove member</h2>
                </div>
                <button
                  type="button"
                  onClick={() => setDeleteTarget(null)}
                  aria-label="Close"
                  className="flex h-7 w-7 items-center justify-center rounded-md text-ink-400 transition-colors hover:bg-paper hover:text-ink"
                >
                  <Cancel01Icon size={16} />
                </button>
              </div>

              <div className="px-6 pb-6">
                <div className="mb-4 flex items-center gap-3 rounded-lg border border-ink-100 bg-paper px-3.5 py-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-ink-800 font-display text-[12px] font-semibold text-white">
                    {memberInitials(deleteTarget.user.name)}
                  </span>
                  <div className="min-w-0">
                    <div className="truncate text-[13px] font-semibold text-ink">
                      {deleteTarget.user.name}
                    </div>
                    <div className="truncate font-mono text-[11.5px] text-ink-500">
                      {deleteTarget.user.email}
                    </div>
                  </div>
                </div>

                <p className="text-[13px] leading-relaxed text-ink-500">
                  Remove{' '}
                  <span className="font-semibold text-ink">{deleteTarget.user.name}</span> from{' '}
                  <span className="font-semibold text-ink">{org?.name ?? 'this organization'}</span>?
                  They will immediately lose access to all datasets, tasks, and evaluations in this organization.
                  This action cannot be undone.
                </p>

                {deleteError && (
                  <p className="mt-4 rounded-md border border-ink-200 bg-paper px-3 py-2.5 font-mono text-[11.5px] text-ink-600">
                    {deleteError}
                  </p>
                )}

                <div className="mt-5 flex justify-end gap-2.5 border-t border-ink-100 pt-4">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setDeleteTarget(null)}
                    disabled={removeMutation.isPending}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    onClick={handleRemove}
                    disabled={removeMutation.isPending}
                    className="border-red-900/40 bg-red-700 text-white hover:bg-red-800 hover:opacity-100"
                  >
                    {removeMutation.isPending ? 'Removing…' : 'Remove member'}
                  </Button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {revokeTarget && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-ink/60 p-5 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setRevokeTarget(null)}
          >
            <motion.div
              className="w-full max-w-110 overflow-hidden rounded-2xl bg-white shadow-2xl"
              initial={{ opacity: 0, y: 16, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 16, scale: 0.98 }}
              transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start justify-between px-6 pb-2 pt-6">
                <div>
                  <p className="mb-2 flex items-center gap-2 font-mono text-[10.5px] uppercase tracking-[0.12em] text-red-600">
                    <span className="h-1.5 w-1.5 rounded-full border border-red-500" />
                    Pending invitation
                  </p>
                  <h2 className="text-[19px] font-semibold">Revoke invitation</h2>
                </div>
                <button
                  type="button"
                  onClick={() => setRevokeTarget(null)}
                  aria-label="Close"
                  className="flex h-7 w-7 items-center justify-center rounded-md text-ink-400 transition-colors hover:bg-paper hover:text-ink"
                >
                  <Cancel01Icon size={16} />
                </button>
              </div>

              <div className="px-6 pb-6">
                <div className="mb-4 flex items-center gap-3 rounded-lg border border-ink-100 bg-paper px-3.5 py-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-ink-200 bg-ink-100 font-display text-[12px] font-semibold text-ink-500">
                    {revokeTarget.email
                      .split('@')[0]
                      .split(/[.\-_]/)
                      .map((p) => p[0])
                      .join('')
                      .toUpperCase()
                      .slice(0, 2)}
                  </span>
                  <div className="min-w-0">
                    <div className="truncate text-[13px] font-semibold text-ink">
                      {revokeTarget.email}
                    </div>
                    <div className="truncate font-mono text-[11.5px] text-ink-500">
                      {ROLE_LABELS[revokeTarget.role] ?? revokeTarget.role} · Invited{' '}
                      {formatRelativeTime(revokeTarget.createdAt)}
                    </div>
                  </div>
                </div>

                <p className="text-[13px] leading-relaxed text-ink-500">
                  Revoke the invitation sent to{' '}
                  <span className="font-semibold text-ink">{revokeTarget.email}</span>? They will
                  no longer be able to accept it and join{' '}
                  <span className="font-semibold text-ink">{org?.name ?? 'this organization'}</span>.
                  This action cannot be undone.
                </p>

                {revokeError && (
                  <p className="mt-4 rounded-md border border-ink-200 bg-paper px-3 py-2.5 font-mono text-[11.5px] text-ink-600">
                    {revokeError}
                  </p>
                )}

                <div className="mt-5 flex justify-end gap-2.5 border-t border-ink-100 pt-4">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setRevokeTarget(null)}
                    disabled={revokeMutation.isPending}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    onClick={handleRevokeConfirm}
                    disabled={revokeMutation.isPending}
                    className="border-red-900/40 bg-red-700 text-white hover:bg-red-800 hover:opacity-100"
                  >
                    {revokeMutation.isPending ? 'Revoking…' : 'Revoke invitation'}
                  </Button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {roleTarget && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-ink/60 p-5 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setRoleTarget(null)}
          >
            <motion.div
              className="w-full max-w-110 overflow-hidden rounded-2xl bg-white shadow-2xl"
              initial={{ opacity: 0, y: 16, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 16, scale: 0.98 }}
              transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start justify-between px-6 pb-2 pt-6">
                <div>
                  <p className="mb-2 flex items-center gap-2 font-mono text-[10.5px] uppercase tracking-[0.12em] text-amber-600">
                    <span className="h-1.5 w-1.5 rounded-full border border-amber-500" />
                    Member role
                  </p>
                  <h2 className="text-[19px] font-semibold">Change role</h2>
                </div>
                <button
                  type="button"
                  onClick={() => setRoleTarget(null)}
                  aria-label="Close"
                  className="flex h-7 w-7 items-center justify-center rounded-md text-ink-400 transition-colors hover:bg-paper hover:text-ink"
                >
                  <Cancel01Icon size={16} />
                </button>
              </div>

              <div className="px-6 pb-6">
                <div className="mb-4 flex items-center gap-3 rounded-lg border border-ink-100 bg-paper px-3.5 py-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-ink-800 font-display text-[12px] font-semibold text-white">
                    {memberInitials(roleTarget.member.user.name)}
                  </span>
                  <div className="min-w-0">
                    <div className="truncate text-[13px] font-semibold text-ink">
                      {roleTarget.member.user.name}
                    </div>
                    <div className="truncate font-mono text-[11.5px] text-ink-500">
                      {roleTarget.member.user.email}
                    </div>
                  </div>
                </div>

                <p className="text-[13px] leading-relaxed text-ink-500">
                  Change{' '}
                  <span className="font-semibold text-ink">{roleTarget.member.user.name}</span> from{' '}
                  <span className="font-semibold text-ink">
                    {ROLE_LABELS[roleTarget.member.role] ?? roleTarget.member.role}
                  </span>{' '}
                  to{' '}
                  <span className="font-semibold text-ink">
                    {ROLE_LABELS[roleTarget.newRole] ?? roleTarget.newRole}
                  </span>
                  ?
                </p>

                {roleTarget.member.userId === currentUserId && (
                  <p className="mt-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2.5 font-mono text-[11.5px] text-amber-700">
                    Warning: changing your own role may lock you out of this organization.
                  </p>
                )}

                {roleError && (
                  <p className="mt-4 rounded-md border border-ink-200 bg-paper px-3 py-2.5 font-mono text-[11.5px] text-ink-600">
                    {roleError}
                  </p>
                )}

                <div className="mt-5 flex justify-end gap-2.5 border-t border-ink-100 pt-4">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setRoleTarget(null)}
                    disabled={changeRoleMutation.isPending}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    onClick={handleRoleConfirm}
                    disabled={changeRoleMutation.isPending}
                    className="border-ink bg-ink text-white hover:opacity-100"
                  >
                    {changeRoleMutation.isPending ? 'Changing…' : 'Change role'}
                  </Button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </AppShell>
  );
}
