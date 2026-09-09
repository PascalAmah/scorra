import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center gap-1.5 rounded-full border px-[11px] py-[5px] font-mono text-[11px] uppercase tracking-[0.05em]',
  {
    variants: {
      variant: {
        solid: 'border-ink bg-ink text-white',
        outline: 'border-ink-600 bg-transparent text-ink',
        inverse: 'border-white bg-white text-ink',
        dot: 'border-ink-600 bg-transparent text-ink',
      },
    },
    defaultVariants: {
      variant: 'outline',
    },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {
  dot?: boolean;
}

const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant, dot = false, ...props }, ref) => (
    <span
      ref={ref}
      className={cn(badgeVariants({ variant, className }))}
      {...props}
    >
      {dot && <span className="h-1.5 w-1.5 rounded-full bg-current" />}
      {props.children}
    </span>
  ),
);
Badge.displayName = 'Badge';

export { Badge, badgeVariants };
