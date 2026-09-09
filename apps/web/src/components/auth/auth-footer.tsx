import * as React from 'react';

interface AuthFooterProps {
  children: React.ReactNode;
}

export function AuthFooter({ children }: AuthFooterProps) {
  return (
    <p className="mt-7 text-center text-[13.5px] text-ink-500">{children}</p>
  );
}
