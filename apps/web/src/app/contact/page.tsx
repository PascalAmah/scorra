import type { Metadata } from 'next';

import { Container } from '@/components/landing/container';
import { Logo } from '@/components/landing/logo';

export const metadata: Metadata = {
  title: 'Contact — Scorra',
  description: 'Get in touch with the Scorra team.',
};

const CONTACT_OPTIONS = [
  {
    label: 'General inquiries',
    email: 'hello@scorra.dev',
    description: 'Product questions, partnerships, press, or anything else.',
  },
  {
    label: 'Technical support',
    email: 'support@scorra.dev',
    description: 'Help with your account, datasets, or evaluation tasks.',
  },
  {
    label: 'Security issues',
    email: 'security@scorra.dev',
    description: 'Report a vulnerability or security concern responsibly.',
  },
];

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-paper">
      <header className="border-b border-ink-200 bg-paper/85 backdrop-blur-md">
        <Container>
          <nav className="flex h-17 items-center justify-between">
            <Logo />
            <a
              href="/"
              className="font-mono text-[12px] uppercase tracking-wider text-ink-500 transition-colors hover:text-ink"
            >
              ← Back to home
            </a>
          </nav>
        </Container>
      </header>

      <main className="pb-24">
        <Container>
          <div className="max-w-180">
            <p className="pt-14 font-mono text-[11px] uppercase tracking-[0.1em] text-ink-400">
              Contact
            </p>
            <h1 className="mt-2 text-[30px] font-semibold text-ink md:text-[38px]">
              Get in touch
            </h1>
            <p className="mt-2 font-mono text-[12.5px] text-ink-500">
              We try to reply within one business day.
            </p>

            <div className="mt-10 space-y-9">
              {CONTACT_OPTIONS.map((option) => (
                <section key={option.email}>
                  <h2 className="text-[17px] font-semibold text-ink">{option.label}</h2>
                  <p className="mt-2.5 text-[14px] leading-[1.7] text-ink-600">
                    {option.description}
                  </p>
                  <a
                    href={`mailto:${option.email}`}
                    className="mt-3 inline-flex items-center gap-2 rounded-sm border border-ink-200 bg-white px-3.5 py-2.5 font-mono text-[13px] text-ink transition-colors hover:border-ink-400 hover:text-ink"
                  >
                    {option.email}
                  </a>
                </section>
              ))}
            </div>

            <p className="mt-12 border-t border-ink-200 pt-6 text-[13px] text-ink-500">
              For urgent issues, contact your organization admin first. They can escalate
              through our support channels faster than a cold inbound message.
            </p>
          </div>
        </Container>
      </main>
    </div>
  );
}
