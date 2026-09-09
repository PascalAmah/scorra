import type { Metadata } from 'next';

import { AuthLayout } from '@/components/auth/auth-layout';
import { AuthCard } from '@/components/auth/auth-card';
import { BrandQuote } from '@/components/auth/brand-quote';
import { ForgotPasswordForm } from '@/components/forms/forgot-password-form';

export const metadata: Metadata = {
  title: 'Forgot password — Scorra',
};

export default function ForgotPasswordPage() {
  return (
    <AuthLayout
      brand={<BrandQuote />}
      legal={
        <>
          By continuing you agree to Scorra&rsquo;s{' '}
          <a href="/terms" className="font-medium text-ink-500 transition-colors hover:text-ink">
            Terms
          </a>{' '}
          and{' '}
          <a href="/privacy" className="font-medium text-ink-500 transition-colors hover:text-ink">
            Privacy Policy
          </a>
          .
        </>
      }
    >
      <AuthCard
        eyebrow="Account recovery"
        title="Forgot your password?"
        subtitle="Enter the email tied to your account and we'll send you a reset link."
      >
        <ForgotPasswordForm />
      </AuthCard>
    </AuthLayout>
  );
}
