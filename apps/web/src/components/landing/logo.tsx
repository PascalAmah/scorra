import Image from 'next/image';
import * as React from 'react';

import { cn } from '@/lib/utils';

interface LogoProps extends React.HTMLAttributes<HTMLAnchorElement> {
  href?: string;
  /** Render on a dark background — the white mark needs no chip. */
  inverse?: boolean;
  /** Compact sizing for the sidebar and mobile top bars. */
  size?: 'sm' | 'md';
}

export function Logo({ href = '#', inverse = false, size = 'md', className, ...props }: LogoProps) {
  return (
    <a
      href={href}
      className={cn(
        'inline-flex items-center',
        !inverse && 'rounded-lg bg-ink px-2.5 py-1.5',
        className,
      )}
      {...props}
    >
      <Image
        src="/scorra-logo.png"
        alt="Scorra"
        width={441}
        height={138}
        priority
        className={cn(
          size === 'sm' ? 'h-5 w-auto' : 'h-5 w-auto md:h-6',
          inverse && (size === 'sm' ? 'h-5 w-auto' : 'h-6 w-auto md:h-7'),
        )}
      />
    </a>
  );
}
