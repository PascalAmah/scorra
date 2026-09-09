import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-sm font-body font-semibold transition-all duration-150 ease-out cursor-pointer select-none disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink',
  {
    variants: {
      variant: {
        default:
          'bg-ink text-white hover:opacity-80 focus-visible:outline-ink',
        ghost:
          'border border-ink-600 bg-transparent text-ink hover:bg-ink hover:text-white hover:border-ink',
        inverse:
          'bg-white text-ink hover:opacity-80 focus-visible:outline-white',
        'ghost-inverse':
          'border border-ink-600 bg-transparent text-white hover:bg-white hover:text-ink hover:border-white',
        text: 'text-ink-500 font-semibold hover:text-ink',
      },
      size: {
        default: 'h-11 px-[22px] text-sm',
        sm: 'h-9 px-4 text-[13px]',
        lg: 'h-12 px-7 text-sm',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  },
);
Button.displayName = 'Button';

export { Button, buttonVariants };
