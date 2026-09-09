'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { cn } from '@/lib/utils';
import { isOrgAdmin } from '@/lib/permissions';
import { useAuthStore } from '@/store/auth-store';

const SECTIONS: { label: string; items: { label: string; href?: string }[] }[] = [
  {
    label: 'Organization',
    items: [
      { label: 'Org profile', href: '/settings' },
      { label: 'API keys' },
      { label: 'Billing' },
      { label: 'Audit log' },
    ],
  },
  {
    label: 'Account',
    items: [{ label: 'My account', href: '/settings/account' }],
  },
];

export function SettingsNav() {
  const pathname = usePathname();
  const user = useAuthStore((s) => s.user);
  const isAdmin = isOrgAdmin(user);

  // Evaluators only get active sections — hide inactive placeholders (API keys,
  // Billing, Audit log) since they are admin-only features.
  const sections = SECTIONS.map((section) => ({
    ...section,
    items: isAdmin ? section.items : section.items.filter((item) => item.href),
  })).filter((section) => section.items.length > 0);

  const isActive = (href: string | undefined) => href === pathname;

  return (
    <nav className="min-w-0" aria-label="Settings">
      {sections.map((section) => (
        <div key={section.label} className="mb-5">
          <p className="mb-2 px-3 font-mono text-[10px] uppercase tracking-[0.1em] text-ink-500">
            {section.label}
          </p>
          <div className="space-y-0.5">
            {section.items.map((item) => {
              const active = isActive(item.href);
              const base = 'block rounded-md px-3 py-2 text-[13px]';
              if (!item.href) {
                return (
                  <span
                    key={item.label}
                    className={cn(base, 'cursor-not-allowed text-ink-400')}
                    aria-disabled="true"
                  >
                    {item.label}
                  </span>
                );
              }
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    base,
                    active
                      ? 'bg-ink font-semibold text-white'
                      : 'text-ink-600 hover:bg-white hover:text-ink',
                  )}
                >
                  {item.label}
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );
}
