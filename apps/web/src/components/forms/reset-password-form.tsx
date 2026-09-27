'use client';

import { Suspense } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { motion } from 'motion/react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useState } from 'react';
import { useForm } from 'react-hook-form';

import { AuthFooter } from '@/components/auth/auth-footer';
import { FormField } from '@/components/auth/form-field';
import { PasswordInput } from '@/components/auth/password-input';
import { SubmitButton } from '@/components/auth/submit-button';
import {
  fadeUpContainer,
  fadeUpItem,
} from '@/components/auth/motion-variants';
import { api } from '@/lib/api';
import {
  resetPasswordSchema,
  type ResetPasswordValues,
} from '@/validations/auth';

export function ResetPasswordForm() {
  return (
    <Suspense
      fallback={
        <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-ink-400">Loading…</p>
      }
    >
      <ResetPasswordContent />
    </Suspense>
  );
}

function ResetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [serverError, setServerError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { password: '', confirmPassword: '' },
  });

  const onSubmit = async (values: ResetPasswordValues) => {
    setServerError(null);

    if (!token) {
      setServerError(
        'This reset link is invalid or incomplete. Request a new one from the log in page.',
      );
      return;
    }

    try {
      await api.resetPassword(token, values.password);
      setSuccess(true);
      // Give the user a moment to read the confirmation, then send them to log in
      setTimeout(() => router.push('/login'), 2500);
    } catch (error) {
      setServerError(
        error instanceof Error ? error.message : 'Unable to reset password. Please try again.',
      );
    }
  };

  if (success) {
    return (
      <motion.div
        variants={fadeUpContainer}
        initial="hidden"
        animate="show"
        className="rounded-lg border border-ink-200 bg-ink-50 p-5"
      >
        <p className="text-[13.5px] font-semibold text-ink">Password updated</p>
        <p className="mt-1.5 text-[13px] leading-relaxed text-ink-500">
          Your password has been changed. You&rsquo;ve been signed out everywhere —
          log in with your new password to continue.
        </p>
        <AuthFooter>
          <Link
            href="/login"
            className="font-semibold text-ink transition-colors hover:underline"
          >
            Go to log in
          </Link>
        </AuthFooter>
      </motion.div>
    );
  }

  if (!token) {
    return (
      <motion.div
        variants={fadeUpContainer}
        initial="hidden"
        animate="show"
        className="rounded-lg border border-ink-200 bg-ink-50 p-5"
      >
        <p className="text-[13.5px] font-semibold text-ink">Invalid reset link</p>
        <p className="mt-1.5 text-[13px] leading-relaxed text-ink-500">
          This link is missing its token or has already been used. Request a
          fresh one and try again.
        </p>
        <AuthFooter>
          <Link
            href="/forgot-password"
            className="font-semibold text-ink transition-colors hover:underline"
          >
            Request new link
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
          label="New password"
          htmlFor="password"
          hint="MIN 8 CHARACTERS · 1 NUMBER · 1 SYMBOL"
          error={errors.password?.message}
        >
          <PasswordInput
            id="password"
            placeholder="••••••••"
            autoComplete="new-password"
            invalid={!!errors.password}
            {...register('password')}
          />
        </FormField>
      </motion.div>

      <motion.div variants={fadeUpItem}>
        <FormField
          label="Confirm new password"
          htmlFor="confirmPassword"
          error={errors.confirmPassword?.message}
        >
          <PasswordInput
            id="confirmPassword"
            placeholder="••••••••"
            autoComplete="new-password"
            invalid={!!errors.confirmPassword}
            {...register('confirmPassword')}
          />
        </FormField>
      </motion.div>

      <motion.div variants={fadeUpItem}>
        <SubmitButton loading={isSubmitting}>Reset password</SubmitButton>
      </motion.div>

      <AuthFooter>
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
