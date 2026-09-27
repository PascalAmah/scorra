import type { Metadata } from 'next';

import { Container } from '@/components/landing/container';
import { Logo } from '@/components/landing/logo';

export const metadata: Metadata = {
  title: 'Careers — Scorra',
  description: 'Join the team building the quality layer for AI.',
};

export default function CareersPage() {
  const roles = [
    {
      title: 'Senior Full-Stack Engineer',
      tag: 'Backend · Frontend',
      description: [
        'Build and ship features across the Scorra web app and API. You will work closely with design and product on evaluation workflows, analytics, and platform reliability.',
      ],
    },
    {
      title: 'Evaluation Research Lead',
      tag: 'Research · Product',
      description: [
        'Shape how Scorra thinks about evaluation design, judge calibration, and agreement metrics. You will work with customers and the product team to turn research questions into platform features.',
      ],
    },
    {
      title: 'Product Designer',
      tag: 'Design · UX',
      description: [
        'Define the experience for teams who evaluate AI systems. You will own flows from dataset import through evaluation, results, and exports — with a strong bias toward clarity and speed.',
      ],
    },
  ];

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
              Careers
            </p>
            <h1 className="mt-2 text-[30px] font-semibold text-ink md:text-[38px]">
              Help us make quality measurable
            </h1>
            <p className="mt-2 font-mono text-[12.5px] text-ink-500">
              We are a small team. We hire deliberately.
            </p>

            <div className="mt-10 space-y-9">
              {roles.map((role) => (
                <section key={role.title}>
                  <div className="flex items-center justify-between gap-4">
                    <h2 className="text-[17px] font-semibold text-ink">{role.title}</h2>
                    <span className="rounded-full border border-ink-200 bg-paper px-2.5 py-1 font-mono text-[10.5px] uppercase tracking-wider text-ink-500">
                      {role.tag}
                    </span>
                  </div>
                  <div className="mt-2.5 space-y-2.5 text-[14px] leading-[1.7] text-ink-600">
                    {role.description.map((paragraph) => (
                      <p key={paragraph.slice(0, 32)}>{paragraph}</p>
                    ))}
                  </div>
                  <div className="mt-4">
                    <form
                      action="mailto:careers@scorra.dev"
                      method="post"
                      className="flex max-w-xs"
                    >
                      <input type="hidden" name="subject" value={`Scorra application: ${role.title}`} />
                      <input
                        type="email"
                        name="email"
                        placeholder="Your work email"
                        required
                        className="flex-1 rounded-sm border border-ink-300 bg-white px-3.5 py-2.5 text-[13px] text-ink placeholder:text-ink-400 focus:border-ink focus:outline-none"
                      />
                      <button
                        type="submit"
                        className="shrink-0 rounded-sm border border-ink bg-ink px-4 py-2.5 font-mono text-[12px] font-semibold text-white transition-colors hover:opacity-90"
                      >
                        Apply
                      </button>
                    </form>
                  </div>
                </section>
              ))}
            </div>

            <p className="mt-12 border-t border-ink-200 pt-6 text-[13px] text-ink-500">
              We are not actively hiring for every role at all times. If you are interested in
              Scorra but do not see the right opening, write to{' '}
              <a
                href="mailto:careers@scorra.dev"
                className="font-semibold text-ink underline-offset-2 hover:underline"
              >
                careers@scorra.dev
              </a>
              .
            </p>
          </div>
        </Container>
      </main>
    </div>
  );
}
