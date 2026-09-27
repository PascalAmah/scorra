import type { AuthResponse } from '@scorra/types';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { clearSessionMarker } from '@/lib/session-cookie';

interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  user: AuthResponse['user'] | null;
  setSession: (session: AuthResponse) => void;
  clearSession: () => void;
  rehydrated: boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      accessToken: null,
      refreshToken: null,
      user: null,
      rehydrated: false,
      setSession: (session) =>
        set({
          accessToken: session.accessToken,
          refreshToken: session.refreshToken,
          user: session.user,
        }),
      clearSession: () => {
        void clearSessionMarker();
        set({ accessToken: null, refreshToken: null, user: null });
      },
    }),
    {
      name: 'scorra-session',
      partialize: (state) => ({
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        user: state.user,
      }),
      onRehydrateStorage: () => () => {
        useAuthStore.setState({ rehydrated: true });
      },
    },
  ),
);
