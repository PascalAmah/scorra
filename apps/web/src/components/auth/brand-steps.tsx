'use client';

import { motion } from 'motion/react';
import { CheckmarkCircle01Icon } from 'hugeicons-react';

import { Eyebrow } from '@/components/landing/section';
import { EASE, fadeUpContainer, fadeUpItem } from '@/components/auth/motion-variants';
import { cn } from '@/lib/utils';

const STEPS = [
  {
    num: '01',
    title: 'Create your workspace',
    body: "You're here — sets up your org and admin account.",
    done: true,
  },
  {
    num: '02',
    title: 'Import a dataset',
    body: 'Upload prompts as CSV, JSON, or JSONL.',
    done: false,
  },
  {
    num: '03',
    title: 'Invite your evaluators',
    body: 'Send invite links — they land straight in the queue.',
    done: false,
  },
];

export function BrandSteps() {
  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: EASE, delay: 0.1 }}
        className="max-w-105"
      >
        <Eyebrow className="text-ink-400">What happens next</Eyebrow>
        <h2 className="mt-4 text-[26px] leading-[1.3]">Three steps to your first evaluation</h2>
        <p className="mt-2.5 text-sm leading-[1.6] text-ink-400">
          Most teams are scoring their first response inside ten minutes of signing up.
        </p>
      </motion.div>

      <motion.ol
        variants={fadeUpContainer}
        initial="hidden"
        animate="show"
        className="flex flex-col gap-3.5"
      >
        {STEPS.map((step) => (
          <motion.li key={step.num} variants={fadeUpItem} className="flex items-start gap-3">
            <span
              className={cn(
                'flex h-6.5 w-6.5 shrink-0 items-center justify-center rounded-[7px] border font-mono text-[11.5px]',
                step.done
                  ? 'border-white bg-white text-ink'
                  : 'border-ink-600 bg-ink-800 text-ink-400',
              )}
            >
              {step.done ? <CheckmarkCircle01Icon size={14} /> : step.num}
            </span>
            <span>
              <span className="block text-[13.5px] font-semibold text-white">{step.title}</span>
              <span className="mt-0.5 block text-xs text-ink-400">{step.body}</span>
            </span>
          </motion.li>
        ))}
      </motion.ol>
    </>
  );
}
