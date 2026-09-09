'use client';

import { motion } from 'motion/react';

import { Eyebrow } from '@/components/landing/section';
import { Viewfinder } from '@/components/landing/viewfinder';
import { EASE } from '@/components/auth/motion-variants';

const STATS = [
  { label: 'Overall agreement rate', value: '88%' },
  { label: "Cohen's kappa", value: '0.76' },
  { label: 'Evaluations this week', value: '2,481' },
  { label: 'Hallucination rate', value: '2.1%' },
];

export function BrandQuote() {
  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: EASE, delay: 0.1 }}
        className="max-w-105"
      >
        <Eyebrow className="text-ink-400">Human-in-the-loop by default</Eyebrow>
        <h2 className="mt-4 text-[26px] leading-[1.3]">
          &ldquo;We can finally show why a deployment shipped, not just that it did.&rdquo;
        </h2>
        <p className="mt-5 font-mono text-xs text-ink-400">
          Priya Anand · Head of AI Quality, Northbeam
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: EASE, delay: 0.25 }}
        className="relative rounded-[14px] border border-ink-600 bg-ink-800 p-6"
      >
        <Viewfinder className="text-white" />
        {STATS.map((stat) => (
          <div
            key={stat.label}
            className="flex items-center justify-between border-b border-ink-700 py-2.75 text-[13px] last:border-b-0"
          >
            <span className="text-ink-400">{stat.label}</span>
            <span className="font-mono font-medium text-white">{stat.value}</span>
          </div>
        ))}
      </motion.div>
    </>
  );
}
