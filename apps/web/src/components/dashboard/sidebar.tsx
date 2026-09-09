'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  ArrowDown01Icon,
  Cancel01Icon,
  ChartUpIcon,
  DashboardSquare01Icon,
  Diamond01Icon,
  Layers01Icon,
  Logout01Icon,
  Settings03Icon,
  Target01Icon,
  UserGroupIcon,
  UserCircleIcon,
} from 'hugeicons-react';
import type { ComponentType } from 'react';

import { Logo } from '@/components/landing/logo';
import { DropdownMenu } from '@/components/ui/dropdown-menu';
import { useAuthStore } from '@/store/auth-store';
import { useOrganizations } from '@/hooks/use-organization';
import { signOut } from '@/services/auth-service';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import { effectiveRole, isOrgAdmin } from '@/lib/permissions';

interface NavItem {
  label: string;
  href: string;
  icon: ComponentType<{ size?: number | string; className?: string }>;
  count?: string;
}

interface NavGroup {
  label?: string;
  items: NavItem[];
}

const ADMIN_NAV: NavGroup[] = [
  {
    items: [
      { label: 'Dashboard', href: '/dashboard', icon: DashboardSquare01Icon },
      { label: 'Datasets', href: '/datasets', icon: Diamond01Icon },
      { label: 'Evaluation Tasks', href: '/tasks', icon: Target01Icon },
      { label: 'Analytics', href: '/analytics', icon: ChartUpIcon },
      { label: 'Exports', href: '/exports', icon: Layers01Icon },
    ],
  },
  {
    label: 'Organization',
    items: [
      { label: 'Members', href: '/members', icon: UserGroupIcon },
      { label: 'Settings', href: '/settings', icon: Settings03Icon },
    ],
  },
];

const EVALUATOR_NAV: NavGroup[] = [
  {
    items: [
      { label: 'Dashboard', href: '/dashboard', icon: DashboardSquare01Icon },
      { label: 'My Tasks', href: '/tasks', icon: Target01Icon },
      { label: 'Settings', href: '/settings', icon: Settings03Icon },
    ],
  },
];

const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: 'Super Admin',
  ORG_ADMIN: 'Org Admin',
  EVALUATOR: 'Evaluator',
  VIEWER: 'Viewer',
};

function initials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();
}

interface SidebarProps extends React.HTMLAttributes<HTMLElement> {
  /** Called when a nav link is followed — used to close the mobile drawer. */
  onNavigate?: () => void;
  /** Called when the drawer close button is pressed (mobile drawer only). */
  onClose?: () => void;
}

export function Sidebar({ className, onNavigate, onClose, ...props }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const setSession = useAuthStore((s) => s.setSession);

  const { data: orgsData } = useOrganizations();
  const orgs = orgsData ?? [];
  const currentOrg = user ? orgs.find((o) => o.id === user.organizationId) ?? orgs[0] : null;

  const isAdmin = isOrgAdmin(user);
  const navGroups = isAdmin ? ADMIN_NAV : EVALUATOR_NAV;

  const handleSwitchOrg = async (orgId: string) => {
    try {
      const session = await api.switchOrg(orgId);
      setSession(session);
      window.location.reload();
    } catch {
      // silent fail
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
    } finally {
      router.push('/');
    }
  };

  return (
    <aside
      className={cn('flex w-60 shrink-0 flex-col bg-ink p-4 text-white', className)}
      {...props}
    >
      <div className="mb-6 flex items-center justify-between px-2">
        <Logo inverse size="sm" href="/dashboard" onClick={onNavigate} />
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Close menu"
            className="-mr-1.5 flex h-8 w-8 items-center justify-center rounded-md text-ink-300 transition-colors hover:bg-ink-800 hover:text-white"
          >
            <Cancel01Icon size={18} />
          </button>
        )}
      </div>

      <DropdownMenu
        align="left"
        width={200}
        trigger={
          <span className="mb-5 flex w-full cursor-pointer items-center gap-2.5 rounded-lg border border-ink-600 bg-ink-800 p-2.5 text-left transition-colors hover:border-ink-500">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[7px] bg-white font-display text-xs font-bold text-ink">
              {(currentOrg?.name ?? '?').slice(0, 2).toUpperCase()}
            </span>
            <span className="min-w-0">
              <span className="block truncate text-[12.5px] font-semibold leading-tight">
                {currentOrg ? currentOrg.name : user ? 'No org' : 'Not signed in'}
              </span>
              <span className="block font-mono text-[10.5px] text-ink-400">
                {user ? (ROLE_LABELS[effectiveRole(user) ?? ''] ?? 'Member') : 'Not signed in'}
              </span>
            </span>
            <ArrowDown01Icon size={14} className="ml-auto shrink-0 text-ink-400" />
          </span>
        }
        items={[
          ...orgs.map((org) => ({
            key: org.id,
            label: org.name ?? 'Unknown',
            onSelect: () => {
              handleSwitchOrg(org.id);
            },
          })),
          {
            key: 'account',
            label: 'Account settings',
            icon: <UserCircleIcon size={15} />,
            onSelect: () => router.push('/settings'),
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

      <nav className="flex flex-1 flex-col gap-5 overflow-y-auto">
        {navGroups.map((group, i) => (
          <div key={i}>
            {group.label && (
              <p className="mb-1.5 px-2 font-mono text-[10px] uppercase tracking-[0.12em] text-ink-500">
                {group.label}
              </p>
            )}
            <ul className="flex flex-col gap-0.5">
              {group.items.map((item) => {
                const active = pathname === item.href;
                return (
                  <li key={item.label}>
                    <Link
                      href={item.href}
                      onClick={onNavigate}
                      className={cn(
                        'flex items-center gap-2.5 rounded-[7px] px-2 py-2 text-[13.5px] transition-colors',
                        active
                          ? 'bg-white font-semibold text-ink'
                          : 'text-ink-300 hover:bg-ink-800 hover:text-white',
                      )}
                    >
                      <item.icon
                        size={15}
                        className={cn('shrink-0', active ? 'text-ink' : 'text-ink-500')}
                      />
                      <span className="truncate">{item.label}</span>
                      {item.count && (
                        <span
                          className={cn(
                            'ml-auto font-mono text-[10.5px]',
                            active ? 'text-ink-500' : 'text-ink-500',
                          )}
                        >
                          {item.count}
                        </span>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className="flex items-center gap-2.5 border-t border-ink-700 px-2 pt-3">
        <span className="flex h-7.5 w-7.5 shrink-0 items-center justify-center rounded-full border border-ink-600 bg-ink-800 font-display text-xs font-semibold text-white">
          {user?.name ? initials(user.name) : '?'}
        </span>
        <span className="min-w-0">
          <span className="block truncate text-[12.5px] font-semibold leading-tight">
            {user?.name ?? 'Guest'}
          </span>
          <span className="block truncate font-mono text-[10.5px] text-ink-400">
            {user?.email ?? 'Not signed in'}
          </span>
        </span>
      </div>
    </aside>
  );
}
