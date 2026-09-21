'use client';

import * as React from 'react';
import { AnimatePresence, motion } from 'motion/react';

import { Sidebar } from './sidebar';

const AppShellContext = React.createContext<{ openSidebar: () => void } | null>(null);

export function useAppShell() {
  const ctx = React.useContext(AppShellContext);
  if (!ctx) return null;
  return ctx;
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = React.useState(false);
  const [mounted, setMounted] = React.useState(false);

  // The persisted session lives in localStorage and is only available on the
  // client, so the server-rendered HTML has no user. Holding the shell until
  // the first client frame replaces that SSR flash of "Not signed in" /
  // "Guest" / "No org" with a neutral loader, which then swaps in the real
  // authenticated chrome.
  React.useEffect(() => {
    if (typeof requestAnimationFrame === 'undefined') {
      setMounted(true);
      return;
    }
    const id = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(id);
  }, []);

  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  if (!mounted) {
    return (
      <div className="min-h-screen bg-paper">
        <div className="flex min-h-screen items-center justify-center">
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-ink-500">
            Loading…
          </p>
        </div>
      </div>
    );
  }

  return (
    <AppShellContext.Provider value={{ openSidebar: () => setOpen(true) }}>
      <div className="min-h-screen bg-paper">
        <div className="lg:grid lg:grid-cols-[240px_1fr]">
          <Sidebar className="sticky top-0 hidden h-screen lg:flex" />
          <main className="min-w-0">{children}</main>
        </div>

        <AnimatePresence>
          {open && (
            <>
              <motion.div
                className="fixed inset-0 z-50 bg-ink/60 backdrop-blur-sm lg:hidden"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                onClick={() => setOpen(false)}
              />
              <motion.div
                className="fixed inset-y-0 left-0 z-50 lg:hidden"
                initial={{ x: -280 }}
                animate={{ x: 0 }}
                exit={{ x: -280 }}
                transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
              >
                <Sidebar
                  className="h-full shadow-2xl"
                  onNavigate={() => setOpen(false)}
                  onClose={() => setOpen(false)}
                />
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>
    </AppShellContext.Provider>
  );
}
