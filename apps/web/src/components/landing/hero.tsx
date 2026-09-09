'use client';

import { motion } from 'motion/react';
import { ArrowRight01Icon } from 'hugeicons-react';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Eyebrow } from '@/components/landing/section';
import { Container } from '@/components/landing/container';
import { Viewfinder } from '@/components/landing/viewfinder';

const EASE = [0.16, 1, 0.3, 1] as const;

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.09, delayChildren: 0.05 } },
};

const item = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: EASE } },
};

function HeroPanel() {
  return (
    <motion.div
      variants={item}
      className="relative mt-12 overflow-hidden rounded-[20px] bg-ink text-left text-white md:mt-14"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(circle at 15% 15%, rgba(255,255,255,.06), transparent 40%), radial-gradient(circle at 85% 90%, rgba(255,255,255,.05), transparent 40%)',
        }}
      />
      <Viewfinder className="text-white" />

      <div className="relative p-8 md:p-11">
        <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="font-display text-[15px] font-semibold text-white">
              Pairwise Comparison — Task #114
            </p>
            <p className="mt-1 font-mono text-[11px] text-ink-400">
              GPT-4o vs Claude 3 Haiku · customer-support-v3
            </p>
          </div>
          <Badge variant="inverse" dot>
            In Review
          </Badge>
        </div>

        <div className="grid gap-3.5 sm:grid-cols-2">
          <div className="rounded-[10px] border border-white bg-ink-800 p-4 md:p-4.5">
            <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.08em] text-ink-400">
              Response A
            </p>
            <p className="text-[12.5px] leading-[1.55] text-ink-200">
              &ldquo;Your refund was processed on the 3rd and should post to your original payment
              method within 5–7 business days.&rdquo;
            </p>
          </div>
          <div className="rounded-[10px] border border-ink-600 bg-ink-800 p-4 md:p-4.5">
            <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.08em] text-ink-400">
              Response B
            </p>
            <p className="text-[12.5px] leading-[1.55] text-ink-200">
              &ldquo;I&rsquo;ve gone ahead and issued your refund — you should see it soon,
              typically within a week or so.&rdquo;
            </p>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-ink-700 pt-4">
          <div className="flex flex-wrap gap-2">
            {['A Better', 'B Better', 'Tie', 'Both Bad'].map((v, i) => (
              <span
                key={v}
                className={
                  i === 0
                    ? 'rounded-md border border-white bg-white px-3 py-1.5 font-mono text-[10.5px] uppercase tracking-wider text-ink'
                    : 'rounded-md border border-ink-600 px-3 py-1.5 font-mono text-[10.5px] uppercase tracking-wider text-ink-400'
                }
              >
                {v}
              </span>
            ))}
          </div>
          <p className="font-mono text-[11px] text-ink-400">
            Inter-rater agreement <span className="font-semibold text-white">88%</span>
          </p>
        </div>
      </div>
    </motion.div>
  );
}

export function Hero() {
  return (
    <section className="relative overflow-hidden pt-16 pb-16 text-center md:pt-24 md:pb-16">
      <Container>
        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          className="relative z-10 flex flex-col items-center"
        >
          <motion.div variants={item}>
            <Eyebrow centered>Quality Operating System for AI</Eyebrow>
          </motion.div>

          <motion.h1
            variants={item}
            className="mx-auto mt-6 max-w-200 text-[clamp(36px,5.2vw,60px)] text-ink"
          >
            Ship AI features you can defend, not just demo.
          </motion.h1>

          <motion.p
            variants={item}
            className="mx-auto mt-5 max-w-140 text-base leading-[1.6] text-ink-500"
          >
            Scorra turns human and AI judgment into evidence — evaluate every model response, catch
            regressions before your users do, and back every deployment with a number, not a vibe.
          </motion.p>

          <motion.div
            variants={item}
            className="mt-8 flex flex-col items-center gap-3.5 sm:flex-row"
          >
            <Button size="lg" asChild>
              <a href="/register">
                Start free
                <ArrowRight01Icon size={16} />
              </a>
            </Button>
            <Button size="lg" variant="ghost" asChild>
              <a href="#product">See how it works</a>
            </Button>
          </motion.div>

          <motion.p variants={item} className="mt-5 font-mono text-[11.5px] text-ink-400">
            No credit card required · Free for teams up to 5 evaluators
          </motion.p>

          <HeroPanel />
        </motion.div>
      </Container>
    </section>
  );
}
