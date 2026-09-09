'use client';

import { motion } from 'motion/react';
import * as React from 'react';

import { Eyebrow } from '@/components/landing/section';
import { EASE } from '@/components/auth/motion-variants';

interface AuthCardProps {
  eyebrow: string;
  title: string;
  subtitle: string;
  children: React.ReactNode;
}

export function AuthCard({ eyebrow, title, subtitle, children }: AuthCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: EASE }}
    >
      <Eyebrow>{eyebrow}</Eyebrow>
      <h1 className="mt-4 text-[28px] text-ink md:text-[30px]">{title}</h1>
      <p className="mt-2.5 mb-8 text-sm text-ink-500 md:text-[14px]">{subtitle}</p>
      {children}
    </motion.div>
  );
}
