'use client';

import { useState } from 'react';
import { ArrowRight01Icon } from 'hugeicons-react';

import { Button } from '@/components/ui/button';
import { Logo } from '@/components/landing/logo';
import { Container } from '@/components/landing/container';

const PRODUCT_LINKS = [
  { label: 'Dataset Hub', href: '/datasets' },
  { label: 'Evaluations', href: '/tasks' },
  { label: 'AI Judge', href: '/tasks' },
  { label: 'Analytics', href: '/analytics' },
];

const COMPANY_LINKS = [
  { label: 'About', href: '/about' },
  { label: 'Careers', href: '/careers' },
  { label: 'Contact', href: '/contact' },
];

export function Footer() {
  const [email, setEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setSubscribed(true);
  };

  return (
    <footer className="bg-ink text-ink-300">
      <Container>
        <div className="grid gap-10 py-16 md:grid-cols-[1.4fr_1fr_1fr_1.2fr] md:py-17.5">
          <div>
            <Logo inverse className="mb-3.5" />
            <p className="max-w-65 text-[13px] leading-[1.6] text-ink-400">
              The quality operating system for AI applications. Human-in-the-loop by default.
            </p>
          </div>

          <div>
            <h5 className="mb-4 font-mono text-[11px] uppercase tracking-widest text-ink-400">
              Product
            </h5>
            <ul>
              {PRODUCT_LINKS.map((link) => (
                <li key={link.label} className="mb-2.5 text-[13.5px]">
                  <a href={link.href} className="transition-colors hover:text-white">
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h5 className="mb-4 font-mono text-[11px] uppercase tracking-widest text-ink-400">
              Company
            </h5>
            <ul>
              {COMPANY_LINKS.map((link) => (
                <li key={link.label} className="mb-2.5 text-[13.5px]">
                  <a href={link.href} className="transition-colors hover:text-white">
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h5 className="mb-4 font-mono text-[11px] uppercase tracking-widest text-ink-400">
              Stay on target
            </h5>
            {subscribed ? (
              <p className="font-mono text-[12.5px] text-ink-200">You&rsquo;re on the list.</p>
            ) : (
              <form onSubmit={handleSubscribe} className="flex flex-col gap-2.5">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Your work email"
                  aria-label="Work email"
                  className="h-11 w-full rounded-sm border border-ink-700 bg-ink-800 px-3.5 text-[13px] text-white placeholder:text-ink-400 focus:outline-2 focus:outline-offset-1 focus:outline-white"
                />
                <Button variant="inverse" size="sm" type="submit">
                  Subscribe
                  <ArrowRight01Icon size={14} />
                </Button>
              </form>
            )}
          </div>
        </div>

        <div className="flex flex-col items-start justify-between gap-3 border-t border-ink-700 py-6 font-mono text-xs text-ink-500 sm:flex-row sm:items-center">
          <span>© 2026 Scorra. All rights reserved.</span>
          <div className="flex items-center gap-5">
            <a href="/terms" className="transition-colors hover:text-white">
              Terms of Service
            </a>
            <a href="/privacy" className="transition-colors hover:text-white">
              Privacy Policy
            </a>
            <span className="hidden md:inline">Quality is measurable.</span>
          </div>
        </div>
      </Container>
    </footer>
  );
}
