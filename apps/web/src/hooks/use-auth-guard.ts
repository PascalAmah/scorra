'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth-store';
import { api } from '@/lib/api';

export function useAuthGuard() {
  const router = useRouter();
  const pathname = usePathname();
  const accessToken = useAuthStore((s) => s.accessToken);
  const user = useAuthStore((s) => s.user);
  const rehydrated = useAuthStore((s) => s.rehydrated);
  const [done, setDone] = useState(false);

  const redirectToLogin = () => {
    const target = pathname ? `?next=${encodeURIComponent(pathname)}` : '';
    router.replace(`/login${target}`);
  };

  useEffect(() => {
    if (done || !rehydrated) return;

    if (!accessToken || !user) {
      redirectToLogin();
      setDone(true);
      return;
    }

    let cancelled = false;

    api.me().catch(() => {
      if (!cancelled) {
        useAuthStore.getState().clearSession();
        redirectToLogin();
      }
    });

    return () => {
      cancelled = true;
    };
  }, [accessToken, user, router, pathname, done, rehydrated]);

  useEffect(() => {
    if (accessToken && user) setDone(true);
  }, [accessToken, user]);
}
