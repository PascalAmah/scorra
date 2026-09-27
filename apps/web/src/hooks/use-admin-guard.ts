'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

import { isOrgAdmin } from '@/lib/permissions';
import { useAuthStore } from '@/store/auth-store';

export function useAdminGuard(fallback = '/tasks'): boolean {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const rehydrated = useAuthStore((s) => s.rehydrated);
  const isAdmin = isOrgAdmin(user);

  useEffect(() => {
    if (!rehydrated || isAdmin) return;
    if (!user) return;
    router.replace(fallback);
  }, [rehydrated, user, isAdmin, fallback, router]);

  return isAdmin;
}
