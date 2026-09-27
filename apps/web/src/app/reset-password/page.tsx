import type { Metadata } from 'next';

import { AuthLayout } from '@/components/auth/auth-layout';
import { AuthCard } from '@/components/auth/auth-card';
import { BrandQuote } from '@/components/auth/brand-quote';
import { ResetPasswordForm } from '@/components/forms/reset-password-form';

export const metadata: Metadata = {
  title: 'Reset password — Scorra',
};

export default function ResetPasswordPage() {
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
        eyebrow="Security"
        title="Set a new password"
        subtitle="Choose a strong password you haven't used elsewhere."
      >
        <ResetPasswordForm />
      </AuthCard>
    </AuthLayout>
  );
}
