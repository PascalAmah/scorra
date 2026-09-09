'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Add02Icon, Cancel02Icon } from 'hugeicons-react';

import { Container } from '@/components/landing/container';
import { Section, SectionHeader } from '@/components/landing/section';
import { staggerContainer, staggerItem } from '@/components/landing/reveal';
import { cn } from '@/lib/utils';

const FAQS = [
  {
    q: 'What is an AI Judge?',
    a: 'An AI Judge is an automated evaluator that scores model responses against your custom criteria. It uses LLMs (like GPT-4o, Claude, or open-source models) to assess accuracy, relevance, fluency, safety, and more — giving you consistent, scalable evaluations without human bottlenecks.',
  },
  {
    q: 'Which AI models does Scorra support?',
    a: 'Scorra supports OpenAI (GPT-4o, GPT-4), Anthropic (Claude 3.5), Groq (Llama 3.3), and Google Gemini. You can mix providers, run pairwise comparisons across different models, and use any of them as your AI Judge.',
  },
  {
    q: 'How does pairwise comparison work?',
    a: 'In pairwise mode, evaluators see two model responses side-by-side (anonymized) and pick which one is better. Scorra shuffles the order to prevent bias and tracks win rates, ties, and per-dimension verdicts across your team.',
  },
  {
    q: 'Can I use my own datasets?',
    a: 'Yes. Upload CSV, JSON, or JSONL files with your prompts and expected outputs. Scorra parses them automatically, versions your datasets, and supports diffing between versions so you can track quality over time.',
  },
  {
    q: 'What analytics does Scorra provide?',
    a: 'Scorra computes evaluator agreement (Fleiss kappa, Cohen kappa), score trend charts, per-model win rates, hallucination detection reports, and feedback summaries. Everything is exportable as CSV, JSON, or JSONL.',
  },
  {
    q: 'Is Scorra open source?',
    a: 'Scorra is free to use during development. The core platform handles dataset management, multi-provider AI evaluation, and analytics. Enterprise features like SSO, audit logging, and on-prem deployment are available on paid plans.',
  },
];

function FaqItem({ q, a, isOpen, onToggle }: { q: string; a: string; isOpen: boolean; onToggle: () => void }) {
  return (
    <motion.div variants={staggerItem} className="border-b border-ink-200 last:border-b-0">
      <button
        onClick={onToggle}
        className="flex w-full items-center justify-between gap-4 py-5 text-left"
      >
        <span className="text-[15px] font-medium text-ink md:text-[16.5px]">{q}</span>
        {isOpen ? (
          <Cancel02Icon size={18} className="shrink-0 text-ink-500" />
        ) : (
          <Add02Icon size={18} className="shrink-0 text-ink-500" />
        )}
      </button>
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden"
          >
            <p className="pb-5 text-[13.5px] leading-[1.65] text-ink-500">{a}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export function Faq() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <Section id="faq" alt>
      <Container>
        <SectionHeader
          eyebrow="FAQ"
          title={
            <>
              Frequently asked <span className="text-ink-400">questions</span>
            </>
          }
        />

        <motion.div
          variants={staggerContainer}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: '-80px' }}
          className="mx-auto max-w-200"
        >
          {FAQS.map((faq, index) => (
            <FaqItem
              key={faq.q}
              q={faq.q}
              a={faq.a}
              isOpen={openIndex === index}
              onToggle={() => setOpenIndex(openIndex === index ? null : index)}
            />
          ))}
        </motion.div>
      </Container>
    </Section>
  );
}
