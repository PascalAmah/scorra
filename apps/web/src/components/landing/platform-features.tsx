'use client';

import { motion } from 'motion/react';
import {
  AiBrain01Icon,
  ChartUpIcon,
  Database01Icon,
  Shield01Icon,
  TestTube01Icon,
  ChartEvaluationIcon,
} from 'hugeicons-react';

import { Container } from '@/components/landing/container';
import { Section, SectionHeader } from '@/components/landing/section';
import { staggerContainer, staggerItem } from '@/components/landing/reveal';

const FEATURES = [
  {
    icon: Database01Icon,
    title: 'Dataset Hub',
    body: 'Versioned prompt datasets with search, cloning, and row-level editing. Your source of truth for what gets evaluated.',
  },
  {
    icon: ChartEvaluationIcon,
    title: 'Evaluation Engine',
    body: 'Single-score, pairwise, and ranking workflows — each one feeding the same underlying quality metrics.',
  },
  {
    icon: AiBrain01Icon,
    title: 'AI Judge',
    body: 'Confidence-scored AI evaluation with hallucination detection — accelerates review, never replaces a human sign-off.',
  },
  {
    icon: ChartUpIcon,
    title: 'Quality Analytics',
    body: 'Inter-rater agreement, Cohen\u2019s kappa, score trends, and evaluator throughput in one dashboard.',
  },
  {
    icon: TestTube01Icon,
    title: 'Regression Testing',
    body: 'Turn evaluations into reusable test suites and replay them against a new model before you promote it.',
  },
  {
    icon: Shield01Icon,
    title: 'Governance & Export',
    body: 'Org roles, invitations, audit logs, and portable exports in JSONL, CSV, or JSON.',
  },
];

export function PlatformFeatures() {
  return (
    <Section alt>
      <Container>
        <SectionHeader
          eyebrow="Platform"
          title={
            <>
              Everything a quality team <span className="text-ink-400">actually needs</span>
            </>
          }
        />

        <motion.div
          variants={staggerContainer}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: '-80px' }}
          className="grid gap-4 sm:grid-cols-2 md:gap-4.5 lg:grid-cols-3"
        >
          {FEATURES.map((feature) => (
            <motion.article
              key={feature.title}
              variants={staggerItem}
              className="group rounded-2xl border border-ink-200 bg-paper p-7 transition-all duration-300 hover:-translate-y-1 hover:border-ink-400"
            >
              <div className="mb-4.5 flex h-9 w-9 items-center justify-center rounded-[9px] bg-ink text-white transition-transform duration-300 group-hover:scale-105">
                <feature.icon size={16} />
              </div>
              <h4 className="mb-2 text-base">{feature.title}</h4>
              <p className="text-[13px] leading-[1.6] text-ink-500">{feature.body}</p>
            </motion.article>
          ))}
        </motion.div>
      </Container>
    </Section>
  );
}
