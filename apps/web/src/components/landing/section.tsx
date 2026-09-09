import * as React from 'react';

import { cn } from '@/lib/utils';

interface SectionProps extends React.HTMLAttributes<HTMLElement> {
  id?: string;
  alt?: boolean;
  padded?: boolean;
}

export function Section({
  id,
  alt = false,
  padded = true,
  className,
  children,
  ...props
}: SectionProps) {
  return (
    <section
      id={id}
      className={cn(
        padded && 'py-16 md:py-22',
        alt && 'border-y border-ink-200 bg-white',
        className,
      )}
      {...props}
    >
      {children}
    </section>
  );
}

export function SectionHeader({
  eyebrow,
  title,
  description,
  align = 'center',
  className,
}: {
  eyebrow: React.ReactNode;
  title: React.ReactNode;
  description?: React.ReactNode;
  align?: 'center' | 'left';
  className?: string;
}) {
  return (
    <div
      className={cn(
        'mb-12 max-w-145 md:mb-14',
        align === 'center' && 'mx-auto text-center',
        className,
      )}
    >
      <Eyebrow centered={align === 'center'}>{eyebrow}</Eyebrow>
      <h2 className="mt-4 text-[clamp(28px,3.4vw,40px)]">{title}</h2>
      {description && (
        <p className="mt-4 text-sm leading-[1.6] text-ink-500 md:text-[14.5px]">{description}</p>
      )}
    </div>
  );
}

export function Eyebrow({
  children,
  centered = false,
  className,
}: {
  children: React.ReactNode;
  centered?: boolean;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.14em] text-ink-500',
        centered && 'justify-center',
        className,
      )}
    >
      <span aria-hidden className="h-1.5 w-1.5 rounded-full border-[1.5px] border-ink-500" />
      {children}
    </span>
  );
}
