import * as React from 'react';

import { cn } from '@/lib/utils';

interface ContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: 'default' | 'wide';
}

export function Container({ className, size = 'default', ...props }: ContainerProps) {
  return (
    <div
      className={cn(
        'mx-auto w-full px-6 md:px-8',
        size === 'default' && 'max-w-290',
        size === 'wide' && 'max-w-7xl',
        className,
      )}
      {...props}
    />
  );
}
