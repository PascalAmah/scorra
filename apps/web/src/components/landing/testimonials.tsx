'use client';

import { motion } from 'motion/react';

import { Container } from '@/components/landing/container';
import { Section, SectionHeader } from '@/components/landing/section';
import { staggerContainer, staggerItem } from '@/components/landing/reveal';

const TESTIMONIALS = [
  {
    quote:
      'Scorra gave us a paper trail for every model change. We can finally show why a deployment shipped, not just that it did.',
    name: 'Priya Anand',
    role: 'Head of AI Quality, Northbeam',
  },
  {
    quote:
      'The agreement metrics caught an evaluator drifting off-rubric before it touched a single production decision.',
    name: 'Sam Okafor',
    role: 'ML Platform Lead, Ironbridge',
  },
];

function initials(name: string) {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('');
}

export function Testimonials() {
  return (
    <Section>
      <Container>
        <SectionHeader
          eyebrow="Testimonials"
          title={
            <>
              What <span className="text-ink-400">AI teams say</span>
            </>
          }
        />

        <motion.div
          variants={staggerContainer}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: '-80px' }}
          className="grid gap-4 md:grid-cols-2 md:gap-4.5"
        >
          {TESTIMONIALS.map((testimonial) => (
            <motion.figure
              key={testimonial.name}
              variants={staggerItem}
              className="rounded-2xl border border-ink-200 bg-white p-7"
            >
              <blockquote className="mb-5 text-[14.5px] leading-[1.65] text-ink-600">
                &ldquo;{testimonial.quote}&rdquo;
              </blockquote>
              <figcaption className="flex items-center gap-3">
                <span className="flex h-9.5 w-9.5 items-center justify-center rounded-full border border-ink-300 bg-ink-100 font-display text-xs font-semibold text-ink-600">
                  {initials(testimonial.name)}
                </span>
                <span>
                  <span className="block text-[13px] font-semibold text-ink">
                    {testimonial.name}
                  </span>
                  <span className="block text-[11.5px] text-ink-500">{testimonial.role}</span>
                </span>
              </figcaption>
            </motion.figure>
          ))}
        </motion.div>
      </Container>
    </Section>
  );
}
