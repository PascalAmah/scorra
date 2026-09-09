'use client';

import { motion } from 'motion/react';
import { Loading01Icon } from 'hugeicons-react';
import * as React from 'react';

import { Button, type ButtonProps } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface SubmitButtonProps extends ButtonProps {
  loading?: boolean;
}

export function SubmitButton({
  loading = false,
  children,
  className,
  disabled,
  ...props
}: SubmitButtonProps) {
  return (
    <motion.div
      whileTap={{ scale: 0.99 }}
      transition={{ duration: 0.1 }}
    >
      <Button
        type="submit"
        disabled={disabled || loading}
        aria-busy={loading}
        className={cn('w-full', className)}
        {...props}
      >
        {loading && <Loading01Icon size={16} className="animate-spin" />}
        {children}
      </Button>
    </motion.div>
  );
}
