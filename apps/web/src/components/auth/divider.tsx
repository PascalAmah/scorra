import * as React from 'react';

export function Divider({ children = 'or' }: { children?: React.ReactNode }) {
  return (
    <div className="my-6 flex items-center gap-3.5 font-mono text-xs uppercase tracking-[0.06em] text-ink-400">
      <span className="h-px flex-1 bg-ink-200" />
      {children}
      <span className="h-px flex-1 bg-ink-200" />
    </div>
  );
}
