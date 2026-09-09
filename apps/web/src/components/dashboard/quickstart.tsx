import { CheckmarkCircle01Icon } from 'hugeicons-react';

import { cn } from '@/lib/utils';

const STEPS = [
  { num: 1, label: 'Create your workspace', done: true },
  { num: 2, label: 'Import your first dataset', done: true },
  { num: 3, label: 'Invite your evaluators', done: false },
  { num: 4, label: 'Run your first evaluation task', done: false },
];

export function Quickstart() {
  return (
    <div className="rounded-2xl bg-ink p-6 text-white">
      <h3 className="mb-4 text-[15px]">Get set up</h3>
      <ol>
        {STEPS.map((step) => (
          <li
            key={step.num}
            className={cn('flex items-center gap-3 border-b border-ink-700 py-2.5 last:border-b-0')}
          >
            <span
              className={cn(
                'flex h-5 w-5 shrink-0 items-center justify-center rounded-md border font-mono text-[10px]',
                step.done
                  ? 'border-white bg-white text-ink'
                  : 'border-ink-500 bg-ink-800 text-ink-400',
              )}
            >
              {step.done ? <CheckmarkCircle01Icon size={11} /> : step.num}
            </span>
            <span
              className={cn(
                'text-[12.5px]',
                step.done ? 'text-ink-400 line-through' : 'text-ink-100',
              )}
            >
              {step.label}
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}
