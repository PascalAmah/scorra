import { Fragment } from 'react';
import { CheckmarkCircle01Icon } from 'hugeicons-react';

import { cn } from '@/lib/utils';

export function Stepper({ steps, current }: { steps: string[]; current: number }) {
  return (
    <div className="flex items-center overflow-x-auto pb-1">
      {steps.map((label, i) => (
        <Fragment key={label}>
          {i > 0 && (
            <span
              className={cn(
                'mx-3 h-px min-w-4 flex-1',
                i <= current ? 'bg-ink' : 'bg-ink-200',
              )}
            />
          )}
          <div className="flex items-center gap-2.5">
            <span
              className={cn(
                'flex h-7 w-7 shrink-0 items-center justify-center rounded-full border font-mono text-xs',
                i < current
                  ? 'border-ink bg-ink text-white'
                  : i === current
                    ? 'border-ink font-semibold text-ink'
                    : 'border-ink-300 text-ink-400',
              )}
            >
              {i < current ? <CheckmarkCircle01Icon size={13} /> : i + 1}
            </span>
            <span
              className={cn(
                'whitespace-nowrap text-[12.5px]',
                i <= current ? 'font-semibold text-ink' : 'text-ink-400',
              )}
            >
              {label}
            </span>
          </div>
        </Fragment>
      ))}
    </div>
  );
}
