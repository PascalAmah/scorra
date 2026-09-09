import * as React from 'react';

import { cn } from '@/lib/utils';

interface PanelProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string;
  action?: React.ReactNode;
}

export function Panel({ title, action, className, children, ...props }: PanelProps) {
  return (
    <div className={cn('rounded-2xl border border-ink-200 bg-white p-6', className)} {...props}>
      <div className="mb-5 flex items-center justify-between gap-3">
        <h3 className="text-[15px] text-ink">{title}</h3>
        {action}
      </div>
      {children}
    </div>
  );
}
