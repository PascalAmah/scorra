'use client';

import { motion } from 'motion/react';
import { ArrowRight01Icon } from 'hugeicons-react';

import { Container } from '@/components/landing/container';
import { Section, SectionHeader } from '@/components/landing/section';
import { staggerContainer, staggerItem } from '@/components/landing/reveal';

const STEPS = [
  {
    num: '01 / IMPORT',
    title: 'Build the dataset',
    body: 'Upload prompts as CSV, JSON, or JSONL — versioned, searchable, ready to reuse across tasks.',
  },
  {
    num: '02 / COLLECT',
    title: 'Gather responses',
    body: 'Run prompts across models and store every response against the dataset it came from.',
  },
  {
    num: '03 / EVALUATE',
    title: 'Score with humans + AI',
    body: 'Single scores, pairwise verdicts, or rankings — AI accelerates, a human always validates.',
  },
  {
    num: '04 / SHIP',
    title: 'Act on the evidence',
    body: 'Agreement metrics, trend lines, and exports turn judgment into a decision you can defend.',
  },
];

export function Workflow() {
  return (
    <Section id="workflow">
      <Container>
        <SectionHeader
          eyebrow="The evaluation loop"
          title={
            <>
              Every deployment, <span className="text-ink-400">backed by evidence</span>
            </>
          }
        />

        <motion.div
          variants={staggerContainer}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: '-80px' }}
          className="grid gap-4 sm:grid-cols-2 md:gap-4.5 lg:grid-cols-4"
        >
          {STEPS.map((step, i) => (
            <motion.article
              key={step.num}
              variants={staggerItem}
              className="group relative rounded-2xl border border-ink-200 bg-white p-6 transition-all duration-300 hover:-translate-y-1 hover:border-ink-400"
            >
              <div className="mb-4 flex items-center justify-between">
                <span className="font-mono text-xs text-ink-400">{step.num}</span>
                {i < STEPS.length - 1 && (
                  <ArrowRight01Icon
                    size={14}
                    className="hidden text-ink-300 transition-colors group-hover:text-ink-500 lg:block"
                  />
                )}
              </div>
              <h4 className="mb-2 text-[17px]">{step.title}</h4>
              <p className="text-[13px] leading-[1.55] text-ink-500">{step.body}</p>
            </motion.article>
          ))}
        </motion.div>
      </Container>
    </Section>
  );
}
