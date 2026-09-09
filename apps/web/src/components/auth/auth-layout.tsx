import * as React from 'react';

import { Logo } from '@/components/landing/logo';

interface AuthLayoutProps {
  children: React.ReactNode;
  brand: React.ReactNode;
  legal: React.ReactNode;
}

export function AuthLayout({ children, brand, legal }: AuthLayoutProps) {
  return (
    <div className="grid min-h-screen bg-paper lg:grid-cols-2">
      <div className="flex flex-col">
        <div className="px-6 pt-8 sm:px-10 lg:px-14">
          <Logo href="/" />
        </div>

        <main className="mx-auto flex w-full max-w-100 flex-1 flex-col justify-center px-6 py-12 md:py-14">
          {children}
        </main>

        <div className="px-6 pb-8 sm:px-10 lg:px-14">
          <p className="text-[11.5px] text-ink-400">{legal}</p>
        </div>
      </div>

      <aside className="relative hidden overflow-hidden bg-ink p-12 text-white lg:sticky lg:top-0 lg:flex lg:h-screen lg:flex-col lg:justify-between lg:p-14">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              'radial-gradient(circle at 20% 15%, rgba(255,255,255,.06), transparent 40%), radial-gradient(circle at 85% 90%, rgba(255,255,255,.05), transparent 40%)',
          }}
        />
        <div className="relative flex flex-1 flex-col justify-between gap-12">{brand}</div>
      </aside>
    </div>
  );
}
