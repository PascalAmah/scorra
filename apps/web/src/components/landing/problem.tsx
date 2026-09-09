'use client';

import { motion } from 'motion/react';
import { ArrowDownRight01Icon, ArrowUpRight01Icon } from 'hugeicons-react';

import { Container } from '@/components/landing/container';
import { Section, SectionHeader } from '@/components/landing/section';
import { staggerContainer, staggerItem } from '@/components/landing/reveal';

const PROBLEMS = [
  {
    tone: 'negative' as const,
    title: 'Regressions ship silently',
    body: 'A prompt tweak or model swap changes behavior in ways nobody catches until a user complains — there\u2019s no baseline to compare against.',
  },
  {
    tone: 'negative' as const,
    title: 'Evaluation lives in spreadsheets',
    body: 'Ad-hoc scoring in a shared sheet doesn\u2019t scale past a handful of reviewers, and agreement between them is never actually measured.',
  },
  {
    tone: 'positive' as const,
    title: 'Every change is testable',
    body: 'Turn evaluations into reusable regression suites. Run the same benchmark against the old model and the new one before you ship.',
  },
  {
    tone: 'positive' as const,
    title: 'Judgment becomes evidence',
    body: 'Agreement rates, confidence scores, and score trends give you a number to point to when someone asks \u201Care we sure this is better?\u201D',
  },
];

export function ProblemSection() {
  return (
    <Section id="product" alt>
      <Container>
        <SectionHeader
          eyebrow="The problem"
          title={
            <>
              &ldquo;It feels better&rdquo; isn&rsquo;t a{' '}
              <span className="text-ink-400">quality metric</span>
            </>
          }
          description="Most teams ship model changes on gut feel, then find out from users when something's wrong. Scorra makes evaluation a first-class, repeatable step — not an afterthought."
        />

        <motion.div
          variants={staggerContainer}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: '-80px' }}
          className="grid gap-4 sm:grid-cols-2 md:gap-4.5"
        >
          {PROBLEMS.map((card) => (
            <motion.article
              key={card.title}
              variants={staggerItem}
              className="group rounded-2xl border border-ink-200 bg-paper p-7 transition-colors duration-300 hover:border-ink-400"
            >
              <p className="mb-3 flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.08em] text-ink-400">
                {card.tone === 'negative' ? (
                  <ArrowDownRight01Icon size={13} />
                ) : (
                  <ArrowUpRight01Icon size={13} />
                )}
                {card.tone === 'negative' ? 'Without Scorra' : 'With Scorra'}
              </p>
              <h4 className="mb-2 text-[17px]">{card.title}</h4>
              <p className="text-[13.5px] leading-[1.6] text-ink-500">{card.body}</p>
            </motion.article>
          ))}
        </motion.div>
      </Container>
    </Section>
  );
}
