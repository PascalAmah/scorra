import { ArrowUp01Icon } from 'hugeicons-react';

import { cn } from '@/lib/utils';

interface StatCardProps {
  label: string;
  value: string;
  delta: string;
  up: boolean;
}

export function StatCard({ label, value, delta, up }: StatCardProps) {
  return (
    <div className="rounded-2xl border border-ink-200 bg-white p-5">
      <p className="mb-2.5 font-mono text-[10.5px] uppercase tracking-[0.08em] text-ink-500">
        {label}
      </p>
      <p className="font-display text-[28px] font-semibold leading-none text-ink">
        {value}
      </p>
      <p
        className={cn(
          'mt-2 flex items-center gap-1 font-mono text-[11px]',
          up ? 'text-ink' : 'text-ink-400',
        )}
      >
        <ArrowUp01Icon
          size={12}
          className={cn('transition-transform', !up && 'rotate-180 opacity-70')}
        />
        {delta}
      </p>
    </div>
  );
}
