import * as React from 'react';

import { Button } from '@/components/ui/button';

interface SocialButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon?: React.ReactNode;
}

export function SocialButton({ icon, children, ...props }: SocialButtonProps) {
  return (
    <Button variant="ghost" className="w-full" {...props}>
      {icon}
      {children}
    </Button>
  );
}
