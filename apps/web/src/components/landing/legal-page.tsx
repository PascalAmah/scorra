import Link from 'next/link';

import { Container } from '@/components/landing/container';
import { Logo } from '@/components/landing/logo';

export interface LegalSection {
  title: string;
  body: string[];
}

interface LegalPageProps {
  title: string;
  updated: string;
  sections: LegalSection[];
}

export function LegalPage({ title, updated, sections }: LegalPageProps) {
  return (
    <div className="min-h-screen bg-paper">
      <header className="border-b border-ink-200 bg-paper/85 backdrop-blur-md">
        <Container>
          <nav className="flex h-17 items-center justify-between">
            <Logo />
            <Link
              href="/"
              className="font-mono text-[12px] uppercase tracking-wider text-ink-500 transition-colors hover:text-ink"
            >
              ← Back to home
            </Link>
          </nav>
        </Container>
      </header>

      <main className="pb-24">
        <Container>
          <div className="max-w-180">
            <p className="pt-14 font-mono text-[11px] uppercase tracking-[0.1em] text-ink-400">
              Legal
            </p>
            <h1 className="mt-2 text-[30px] font-semibold text-ink md:text-[38px]">{title}</h1>
            <p className="mt-2 font-mono text-[12.5px] text-ink-500">Last updated: {updated}</p>

            <div className="mt-10 space-y-9">
              {sections.map((section) => (
                <section key={section.title}>
                  <h2 className="text-[17px] font-semibold text-ink">{section.title}</h2>
                  {section.body.map((paragraph) => (
                    <p
                      key={paragraph.slice(0, 32)}
                      className="mt-2.5 text-[14px] leading-[1.7] text-ink-600"
                    >
                      {paragraph}
                    </p>
                  ))}
                </section>
              ))}
            </div>

            <p className="mt-12 border-t border-ink-200 pt-6 text-[13px] text-ink-500">
              See also our{' '}
              <Link
                href={title.startsWith('Terms') ? '/privacy' : '/terms'}
                className="font-semibold text-ink underline-offset-2 hover:underline"
              >
                {title.startsWith('Terms') ? 'Privacy Policy' : 'Terms of Service'}
              </Link>
              .
            </p>
          </div>
        </Container>
      </main>
    </div>
  );
}
