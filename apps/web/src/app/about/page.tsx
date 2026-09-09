import type { Metadata } from 'next';

import { Container } from '@/components/landing/container';
import { Logo } from '@/components/landing/logo';

export const metadata: Metadata = {
  title: 'About — Scorra',
  description: 'Scorra turns human and AI judgment into evidence.',
};

export default function AboutPage() {
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
              About
            </p>
            <h1 className="mt-2 text-[30px] font-semibold text-ink md:text-[38px]">
              Building the quality layer for AI
            </h1>
            <p className="mt-2 font-mono text-[12.5px] text-ink-500">Scorra</p>

            <div className="mt-10 space-y-6">
              <section>
                <h2 className="text-[17px] font-semibold text-ink">What we believe</h2>
                <p className="mt-2.5 text-[14px] leading-[1.7] text-ink-600">
                  Every AI application ships with a quality problem. Models drift. Prompts
                  change. Teams rationalize decisions after the fact. Scorra exists so that
                  judgment — human or AI — becomes a first-class, measurable artifact rather
                  than a vibe.
                </p>
              </section>

              <section>
                <h2 className="text-[17px] font-semibold text-ink">What we do</h2>
                <p className="mt-2.5 text-[14px] leading-[1.7] text-ink-600">
                  Scorra is a quality evaluation platform for AI applications. Teams upload
                  datasets, create evaluation tasks, and collect structured judgments — single
                  scoring, pairwise comparison, or ranking. Results feed analytics, agreement
                  metrics, and exports that plug into your existing workflows.
                </p>
              </section>

              <section>
                <h2 className="text-[17px] font-semibold text-ink">Who we are</h2>
                <p className="mt-2.5 text-[14px] leading-[1.7] text-ink-600">
                  We are a small team obsessed with evaluation, evidence, and operational
                  clarity. We build tools that make quality measurable, repeatable, and
                  hard to ignore.
                </p>
              </section>

              <section>
                <h2 className="text-[17px] font-semibold text-ink">Where we are</h2>
                <p className="mt-2.5 text-[14px] leading-[1.7] text-ink-600">
                  Scorra is built and operated from Washington, D.C. Our infrastructure spans
                  multiple regions to keep latency low and data close to the teams that need
                  it.
                </p>
              </section>
            </div>

            <p className="mt-12 border-t border-ink-200 pt-6 text-[13px] text-ink-500">
              See also our{' '}
              <a
                href="/terms"
                className="font-semibold text-ink underline-offset-2 hover:underline"
              >
                Terms of Service
              </a>
              {' '}and{' '}
              <a
                href="/privacy"
                className="font-semibold text-ink underline-offset-2 hover:underline"
              >
                Privacy Policy
              </a>
              .
            </p>
          </div>
        </Container>
      </main>
    </div>
  );
}
