import * as React from 'react';

import { cn } from '@/lib/utils';

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  invalid?: boolean;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, invalid, ...props }, ref) => (
    <input
      ref={ref}
      aria-invalid={invalid || undefined}
      className={cn(
        'h-11 w-full rounded-sm border bg-white px-3.5 font-sans text-sm text-ink transition-colors duration-150 placeholder:text-ink-400',
        'focus:outline-2 focus:outline-offset-1',
        invalid
          ? 'border-red-400 focus:outline-red-500'
          : 'border-ink-300 hover:border-ink-500 focus:outline-ink',
        className,
      )}
      {...props}
    />
  ),
);
Input.displayName = 'Input';

export { Input };
