'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth-store';
import { api } from '@/lib/api';

/**
 * Use this in any protected page to ensure the user is still authenticated.
 *
 * On mount it checks `accessToken`/`user` from the persisted store, then
 * calls `/auth/me` to confirm the server still considers the session valid.
 * If either is missing or the API call fails it clears the stale session and
 * redirects to `/login`.
 */
export function useAuthGuard() {
  const router = useRouter();
  const accessToken = useAuthStore((s) => s.accessToken);
  const user = useAuthStore((s) => s.user);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (done) return;

    if (!accessToken || !user) {
      router.replace('/login');
      setDone(true);
      return;
    }

    let cancelled = false;

    api
      .me()
      .catch(() => {
        if (!cancelled) {
          useAuthStore.getState().clearSession();
          router.replace('/login');
        }
      });

    return () => {
      cancelled = true;
    };
  }, [accessToken, user, router]);

  // Mark as done after first run so we don't re-trigger on store updates.
  useEffect(() => {
    if (accessToken && user) setDone(true);
  }, [accessToken, user]);
}
