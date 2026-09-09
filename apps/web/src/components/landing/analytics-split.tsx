'use client';

import { Button } from '@/components/ui/button';
import { Container } from '@/components/landing/container';
import { Section, Eyebrow } from '@/components/landing/section';
import { Viewfinder } from '@/components/landing/viewfinder';
import { Reveal } from '@/components/landing/reveal';

const ROWS = [
  { label: 'Overall agreement rate', value: '88%' },
  { label: "Cohen's kappa", value: '0.76' },
  { label: 'Avg. overall score', value: '4.2 / 5' },
  { label: 'Hallucination rate', value: '2.1%' },
];

const TABS = ['Agreement', 'Scores', 'Evaluators'];

export function AnalyticsSplit() {
  return (
    <Section>
      <Container>
        <div className="grid items-center gap-10 md:grid-cols-2 md:gap-14">
          <Reveal>
            <div>
              <Eyebrow className="mb-4">Quality analytics</Eyebrow>
              <h2 className="text-[clamp(26px,3vw,36px)]">
                Know if your evaluators agree — before you trust the score
              </h2>
              <p className="mt-4 text-[15px] leading-[1.65] text-ink-500">
                A single reviewer&rsquo;s opinion isn&rsquo;t evidence. Scorra tracks inter-rater
                agreement automatically, so you know whether a low score is a real quality issue or
                one evaluator drifting off the rubric.
              </p>
              <div className="mt-7">
                <Button asChild>
                  <a href="#faq">See plans</a>
                </Button>
              </div>
            </div>
          </Reveal>

          <Reveal delay={0.1}>
            <div className="relative rounded-[18px] bg-ink p-8 text-white md:p-8.5">
              <Viewfinder className="text-white" />
              <div className="rounded-2xl border border-ink-600 bg-ink-800 p-5 md:p-5.5">
                <div className="mb-5 flex gap-4 font-mono text-[11px] text-ink-400">
                  {TABS.map((tab, i) => (
                    <span
                      key={tab}
                      className={i === 0 ? 'border-b border-white pb-1.5 text-white' : 'pb-1.5'}
                    >
                      {tab}
                    </span>
                  ))}
                </div>
                {ROWS.map((row) => (
                  <div
                    key={row.label}
                    className="flex items-center justify-between border-b border-ink-700 py-3 text-[13px] last:border-b-0"
                  >
                    <span className="text-ink-200">{row.label}</span>
                    <span className="font-mono">{row.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </Reveal>
        </div>
      </Container>
    </Section>
  );
}
