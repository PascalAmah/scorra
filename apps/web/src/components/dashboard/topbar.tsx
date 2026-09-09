'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Logout01Icon, Menu01Icon, UserCircleIcon } from 'hugeicons-react';

import { Logo } from '@/components/landing/logo';
import { DropdownMenu } from '@/components/ui/dropdown-menu';
import { useAuthStore } from '@/store/auth-store';
import { signOut } from '@/services/auth-service';
import { useAppShell } from './shell';

interface TopbarProps {
  title: string;
  sub?: string;
  actions?: React.ReactNode;
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();
}

export function Topbar({ title, sub, actions }: TopbarProps) {
  const shell = useAppShell();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);

  const handleSignOut = async () => {
    try {
      await signOut();
    } finally {
      router.push('/');
    }
  };

  return (
    <div className="sticky top-0 z-30 flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-ink-200 bg-paper/90 px-5 py-3 backdrop-blur-md md:px-9 md:py-4.5">
      {shell && (
        <button
          type="button"
          onClick={shell.openSidebar}
          aria-label="Open menu"
          className="-ml-1 order-1 flex h-9 w-9 items-center justify-center rounded-md text-ink hover:bg-ink-100 lg:hidden"
        >
          <Menu01Icon size={20} />
        </button>
      )}
      <Logo href="/dashboard" size="sm" className="order-2 lg:hidden" />
      <div className="order-2 ml-auto lg:hidden">
        <DropdownMenu
          align="right"
          width={200}
          trigger={
            <button
              type="button"
              aria-label="Account menu"
              aria-haspopup="menu"
              className="flex h-9 w-9 items-center justify-center rounded-full border border-ink-200 bg-white font-display text-[11px] font-semibold text-ink transition-colors hover:bg-ink-100"
            >
              {user?.name ? initials(user.name) : '?'}
            </button>
          }
          items={[
            {
              key: 'account',
              label: 'Account settings',
              icon: <UserCircleIcon size={15} />,
              onSelect: () => router.push('/settings/account'),
            },
            {
              key: 'logout',
              label: 'Sign out',
              destructive: true,
              icon: <Logout01Icon size={15} />,
              onSelect: handleSignOut,
            },
          ]}
        />
      </div>
      <div className="order-3 min-w-0 w-full lg:order-none lg:w-auto">
        <h1 className="truncate text-[20px] leading-tight md:text-xl">{title}</h1>
        {sub && (
          <p className="mt-1 truncate font-mono text-[11px] tracking-wide text-ink-500">{sub}</p>
        )}
      </div>
      {actions && (
        <div className="order-4 flex w-full flex-wrap items-center gap-2 lg:order-none lg:ml-auto lg:w-auto lg:justify-end lg:gap-2.5">
          {actions}
        </div>
      )}
    </div>
  );
}
