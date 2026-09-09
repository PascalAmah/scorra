'use client';

import { motion } from 'motion/react';
import { ArrowRight01Icon } from 'hugeicons-react';

import { Button } from '@/components/ui/button';
import { Container } from '@/components/landing/container';

export function CtaBand() {
  return (
    <div className="pb-16 md:pb-27.5">
      <Container>
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="relative overflow-hidden rounded-3xl bg-ink px-7 py-14 text-center text-white md:px-12 md:py-16"
        >
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                'radial-gradient(circle at 50% 0%, rgba(255,255,255,.07), transparent 55%)',
            }}
          />
          <div className="relative">
            <h2 className="mx-auto max-w-160 text-[clamp(26px,3.4vw,38px)]">
              Start evaluating in the next five minutes
            </h2>
            <p className="mx-auto mt-4 mb-8 max-w-110 text-[15px] text-ink-400">
              Upload a dataset, invite your team, and score your first response today.
            </p>
            <div className="flex flex-col items-center justify-center gap-3.5 sm:flex-row">
              <Button variant="inverse" size="lg" asChild>
                <a href="/register">
                  Start free
                  <ArrowRight01Icon size={16} />
                </a>
              </Button>
              <Button variant="ghost-inverse" size="lg" asChild>
                <a href="#">Talk to sales</a>
              </Button>
            </div>
          </div>
        </motion.div>
      </Container>
    </div>
  );
}
