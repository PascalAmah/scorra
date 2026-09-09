'use client';

import type { ReactNode } from 'react';

import { AppShell } from './shell';
import { Topbar } from './topbar';
import { SettingsNav } from './settings-nav';

interface SettingsShellProps {
  sub: string;
  maxWidth?: string;
  children: ReactNode;
}

export function SettingsShell({ sub, maxWidth = 'max-w-[900px]', children }: SettingsShellProps) {
  return (
    <AppShell>
      <Topbar title="Settings" sub={sub} />
      <div className="px-5 pb-16 pt-7 md:px-9">
        <div className={`grid gap-8 md:grid-cols-[210px_1fr] ${maxWidth}`}>
          <SettingsNav />
          <div className="min-w-0">{children}</div>
        </div>
      </div>
    </AppShell>
  );
}