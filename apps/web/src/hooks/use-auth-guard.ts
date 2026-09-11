'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth-store';
import { api } from '@/lib/api';

export function useAuthGuard() {
  const router = useRouter();
  const accessToken = useAuthStore((s) => s.accessToken);
  const user = useAuthStore((s) => s.user);
  const rehydrated = useAuthStore((s) => s.rehydrated);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (done || !rehydrated) return;

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
  }, [accessToken, user, router, done, rehydrated]);

  useEffect(() => {
    if (accessToken && user) setDone(true);
  }, [accessToken, user]);
}

