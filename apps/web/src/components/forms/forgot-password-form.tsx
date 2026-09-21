'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { motion } from 'motion/react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import Link from 'next/link';

import { AuthFooter } from '@/components/auth/auth-footer';
import { FormField } from '@/components/auth/form-field';
import { SubmitButton } from '@/components/auth/submit-button';
import {
  fadeUpContainer,
  fadeUpItem,
} from '@/components/auth/motion-variants';
import { Input } from '@/components/ui/input';
import { api } from '@/lib/api';
import {
  forgotPasswordSchema,
  type ForgotPasswordValues,
} from '@/validations/auth';

export function ForgotPasswordForm() {
  const [serverError, setServerError] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: '' },
  });

  const onSubmit = async (values: ForgotPasswordValues) => {
    setServerError(null);
    try {
      await api.forgotPassword(values.email);
      // Always show the same confirmation — the API intentionally does not
      // reveal whether the email exists.
      setSentTo(values.email);
    } catch (error) {
      setServerError(
        error instanceof Error
          ? error.message
          : 'Unable to send reset email. Please try again.',
      );
    }
  };

  if (sentTo) {
    return (
      <motion.div
        variants={fadeUpContainer}
        initial="hidden"
        animate="show"
        className="rounded-lg border border-ink-200 bg-ink-50 p-5"
      >
        <p className="text-[13.5px] font-semibold text-ink">Check your inbox</p>
        <p className="mt-1.5 text-[13px] leading-relaxed text-ink-500">
          If an account exists for <b className="text-ink">{sentTo}</b>, we&rsquo;ve
          sent a link to reset your password. The link expires in 10 minutes.
        </p>
        <p className="mt-3 text-[12.5px] text-ink-500">
          Didn&rsquo;t get it? Check your spam folder or{' '}
          <button
            type="button"
            onClick={() => setSentTo(null)}
            className="font-semibold text-ink hover:underline"
          >
            try again
          </button>
          .
        </p>
        <AuthFooter>
          <Link
            href="/login"
            className="font-semibold text-ink transition-colors hover:underline"
          >
            Back to log in
          </Link>
        </AuthFooter>
      </motion.div>
    );
  }

  return (
    <motion.form
      variants={fadeUpContainer}
      initial="hidden"
      animate="show"
      onSubmit={handleSubmit(onSubmit)}
      noValidate
    >
      {serverError && (
        <motion.p
          variants={fadeUpItem}
          role="alert"
          className="mb-5 rounded-sm border border-red-300 bg-red-50 px-3.5 py-3 text-[13px] text-red-700"
        >
          {serverError}
        </motion.p>
      )}

      <motion.div variants={fadeUpItem}>
        <FormField
          label="Work email"
          htmlFor="email"
          error={errors.email?.message}
        >
          <Input
            id="email"
            type="email"
            placeholder="you@company.com"
            autoComplete="email"
            invalid={!!errors.email}
            {...register('email')}
          />
        </FormField>
      </motion.div>

      <motion.div variants={fadeUpItem}>
        <SubmitButton loading={isSubmitting}>Send reset link</SubmitButton>
      </motion.div>

      <AuthFooter>
        Remembered it?{' '}
        <Link
          href="/login"
          className="font-semibold text-ink transition-colors hover:underline"
        >
          Back to log in
        </Link>
      </AuthFooter>
    </motion.form>
  );
}
