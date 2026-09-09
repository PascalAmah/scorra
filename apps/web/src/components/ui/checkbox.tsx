import * as React from 'react';

import { cn } from '@/lib/utils';

export interface CheckboxProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  invalid?: boolean;
}

const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, invalid, ...props }, ref) => (
    <input
      ref={ref}
      type="checkbox"
      aria-invalid={invalid || undefined}
      className={cn(
        'h-[15px] w-[15px] shrink-0 cursor-pointer rounded-[3px] accent-ink',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink',
        invalid && 'accent-red-500',
        className,
      )}
      {...props}
    />
  ),
);
Checkbox.displayName = 'Checkbox';

export { Checkbox };
