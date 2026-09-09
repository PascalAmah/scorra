'use client';

import { motion } from 'motion/react';
import { CheckmarkCircle01Icon } from 'hugeicons-react';

import { Button } from '@/components/ui/button';
import { Container } from '@/components/landing/container';
import { Section, SectionHeader } from '@/components/landing/section';
import { staggerContainer, staggerItem } from '@/components/landing/reveal';
import { cn } from '@/lib/utils';

const PLANS = [
  {
    tier: 'Team',
    amount: '$79',
    per: '/mo',
    blurb: 'For small evaluation teams',
    features: [
      'Up to 5 evaluators',
      'Single + pairwise evaluation',
      'Dataset versioning',
      'Email support',
    ],
    cta: 'Get started',
    href: '/register',
    featured: false,
  },
  {
    tier: 'Growth',
    amount: '$249',
    per: '/mo',
    blurb: 'For teams shipping weekly',
    features: [
      'Unlimited evaluators',
      'AI Judge + hallucination detection',
      'Quality analytics dashboard',
      'Regression test suites',
    ],
    cta: 'Get started',
    href: '/register',
    featured: true,
  },
  {
    tier: 'Enterprise',
    amount: 'Custom',
    per: '',
    blurb: 'For regulated organizations',
    features: [
      'SSO / SAML',
      'Audit center + compliance reporting',
      'On-prem / VPC deployment',
      'Dedicated support',
    ],
    cta: 'Contact sales',
    href: '#',
    featured: false,
  },
];

export function Pricing() {
  return (
    <Section id="pricing" alt>
      <Container>
        <SectionHeader
          eyebrow="Pricing"
          title={
            <>
              Simple, <span className="text-ink-400">transparent</span> plans
            </>
          }
        />

        <motion.div
          variants={staggerContainer}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: '-80px' }}
          className="grid items-stretch gap-4 md:grid-cols-3 md:gap-4.5"
        >
          {PLANS.map((plan) => (
            <motion.div
              key={plan.tier}
              variants={staggerItem}
              className={cn(
                'flex flex-col rounded-2xl border p-7 md:p-8',
                plan.featured ? 'border-ink bg-ink text-white' : 'border-ink-200 bg-white text-ink',
              )}
            >
              <p
                className={cn(
                  'font-mono text-[13px] font-semibold uppercase tracking-wider',
                  plan.featured ? 'text-ink-300' : 'text-ink-500',
                )}
              >
                {plan.tier}
              </p>
              <div className="mt-4 flex items-baseline gap-1">
                <span className="font-display text-[38px] font-semibold">{plan.amount}</span>
                {plan.per && (
                  <span
                    className={cn('text-[15px]', plan.featured ? 'text-ink-400' : 'text-ink-500')}
                  >
                    {plan.per}
                  </span>
                )}
              </div>
              <p
                className={cn(
                  'mt-1.5 mb-6 text-[12.5px]',
                  plan.featured ? 'text-ink-400' : 'text-ink-500',
                )}
              >
                {plan.blurb}
              </p>

              <ul className="mb-7">
                {plan.features.map((feature) => (
                  <li
                    key={feature}
                    className={cn(
                      'flex items-start gap-2 border-t py-2 text-[13px] first:border-t-0',
                      plan.featured ? 'border-ink-700' : 'border-ink-200',
                    )}
                  >
                    <CheckmarkCircle01Icon
                      size={15}
                      className={cn('mt-0.5 shrink-0', plan.featured ? 'text-white' : 'text-ink')}
                    />
                    {feature}
                  </li>
                ))}
              </ul>

              <div className="mt-auto">
                <Button variant={plan.featured ? 'inverse' : 'ghost'} className="w-full" asChild>
                  <a href={plan.href}>{plan.cta}</a>
                </Button>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </Container>
    </Section>
  );
}
