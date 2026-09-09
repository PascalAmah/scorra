import type { UserRole } from '@scorra/types';

type SessionUser = { role?: string; organizationRole?: string } | null | undefined;

export function effectiveRole(user: SessionUser): UserRole | undefined {
  return ((user?.organizationRole ?? user?.role) as UserRole) || undefined;
}

export function isOrgAdmin(user: SessionUser): boolean {
  const role = effectiveRole(user);
  return role === 'ORG_ADMIN' || role === 'SUPER_ADMIN';
}
