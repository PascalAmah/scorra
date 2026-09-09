'use client';

import { motion } from 'motion/react';

import { Container } from '@/components/landing/container';
import { Eyebrow } from '@/components/landing/section';

const LOGOS = ['NORTHBEAM', 'IRONBRIDGE', 'VANTAGE XI', 'PACELINE', 'DRAFTPOINT'];

export function Trustbar() {
  return (
    <div className="pt-8.5 pb-16 text-center md:pb-22">
      <Container>
        <Eyebrow centered className="mb-7">
          Built for teams shipping LLM products
        </Eyebrow>
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.8 }}
          className="flex flex-wrap items-center justify-center gap-x-10 gap-y-4 font-display text-[15px] font-semibold text-ink-300 md:gap-x-13 md:text-base"
        >
          {LOGOS.map((logo) => (
            <span key={logo} className="transition-colors duration-300 hover:text-ink-400">
              {logo}
            </span>
          ))}
        </motion.div>
      </Container>
    </div>
  );
}
