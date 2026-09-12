'use client';

import { AnimatePresence, motion } from 'motion/react';
import { Menu01Icon, Cancel01Icon, Logout01Icon, UserCircleIcon } from 'hugeicons-react';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Logo } from '@/components/landing/logo';
import { useAuthStore } from '@/store/auth-store';
import { signOut } from '@/services/auth-service';
import { cn } from '@/lib/utils';

// Absolute paths so these links also work from pages that render the navbar
// outside the landing page (e.g. /docs). On the landing page the path already
// matches, so the browser still treats them as same-document fragment jumps
// and smooth-scrolls without a reload.
const NAV_LINKS = [
  { label: 'Product', href: '/#product' },
  { label: 'How it works', href: '/#workflow' },
  { label: 'FAQ', href: '/#faq' },
  { label: 'Docs', href: '/docs' },
];

export function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const user = useAuthStore((state) => state.user);

  const isDocs = pathname?.startsWith('/docs') === true;

  const handleLogout = async () => {
    setUserMenuOpen(false);
    try {
      await signOut();
    } finally {
      router.push('/');
    }
  };

  const initial = user?.name?.charAt(0).toUpperCase() ?? 'S';

  return (
    <header className="sticky top-0 z-50 border-b border-ink-200 bg-paper/85 backdrop-blur-md">
      <nav className="mx-auto flex h-17 max-w-290 items-center justify-between px-6 md:px-8">
        <Logo />

        <div className="hidden items-center gap-8 text-sm text-ink-500 md:flex">
          {NAV_LINKS.map((link) => (
            <a
              key={link.label}
              href={link.href}
              className={cn(
                'transition-colors hover:text-ink',
                link.href === '/docs' && isDocs && 'font-medium text-ink',
              )}
            >
              {link.label}
            </a>
          ))}
        </div>

        {user ? (
          <div className="relative hidden items-center gap-3 md:flex">
            <Button variant="ghost" size="sm" asChild>
              <a href="/dashboard">Dashboard</a>
            </Button>
            <button
              type="button"
              aria-label="Open account menu"
              aria-expanded={userMenuOpen}
              onClick={() => setUserMenuOpen((v) => !v)}
              className="flex h-9 w-9 items-center justify-center rounded-full border border-ink-300 bg-ink text-xs font-semibold text-white transition-colors hover:bg-ink-700"
            >
              {initial}
            </button>
            <AnimatePresence>
              {userMenuOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 6 }}
                  transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
                  className="absolute right-0 top-full mt-3 w-56 rounded-lg border border-ink-200 bg-white p-1.5 shadow-lg"
                >
                  <div className="border-b border-ink-200 px-3 py-2.5">
                    <p className="truncate text-[13px] font-semibold text-ink">{user.name}</p>
                    <p className="truncate text-[11.5px] text-ink-500">{user.email}</p>
                  </div>
                  <a
                    href="/dashboard"
                    onClick={() => setUserMenuOpen(false)}
                    className="mt-1 flex items-center gap-2 rounded-sm px-3 py-2 text-[13px] font-medium text-ink-600 transition-colors hover:bg-ink-100 hover:text-ink"
                  >
                    <UserCircleIcon size={15} />
                    Dashboard
                  </a>
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="flex w-full items-center gap-2 rounded-sm px-3 py-2 text-left text-[13px] font-medium text-ink-600 transition-colors hover:bg-ink-100 hover:text-ink"
                  >
                    <Logout01Icon size={15} />
                    Log out
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ) : (
          <div className="hidden items-center gap-2 md:flex">
            <Button variant="text" size="sm" asChild>
              <a href="/login">Log in</a>
            </Button>
            <Button size="sm" asChild>
              <a href="/register">Start free</a>
            </Button>
          </div>
        )}

        <button
          type="button"
          aria-label={open ? 'Close menu' : 'Open menu'}
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
          className="inline-flex h-10 w-10 items-center justify-center rounded-sm text-ink transition-colors hover:bg-ink-100 md:hidden"
        >
          {open ? <Cancel01Icon size={20} /> : <Menu01Icon size={20} />}
        </button>
      </nav>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="absolute inset-x-0 top-full h-auto overflow-hidden border-b border-ink-200 bg-paper shadow-xl md:hidden"
          >
            <div className="flex flex-col gap-1 px-6 py-4">
              {NAV_LINKS.map((link) => (
                <a
                  key={link.label}
                  href={link.href}
                  onClick={() => setOpen(false)}
                  className={cn(
                    'rounded-sm px-2 py-3 text-sm font-medium transition-colors hover:bg-ink-100 hover:text-ink',
                    link.href === '/docs' && isDocs ? 'text-ink' : 'text-ink-500',
                  )}
                >
                  {link.label}
                </a>
              ))}
              <div className="mt-2 flex flex-col gap-2 border-t border-ink-200 pt-4">
                {user ? (
                  <>
                    <p className="px-2 text-[12.5px] text-ink-500">
                      Signed in as <span className="font-semibold text-ink">{user.email}</span>
                    </p>
                    <Button variant="ghost" asChild>
                      <a href="/dashboard" onClick={() => setOpen(false)}>
                        Dashboard
                      </a>
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={() => {
                        setOpen(false);
                        handleLogout();
                      }}
                    >
                      Log out
                    </Button>
                  </>
                ) : (
                  <>
                    <Button variant="ghost" asChild>
                      <a href="/login">Log in</a>
                    </Button>
                    <Button asChild>
                      <a href="/register">Start free</a>
                    </Button>
                  </>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
