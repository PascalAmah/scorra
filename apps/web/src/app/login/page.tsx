import type { Metadata } from 'next';

import { AuthLayout } from '@/components/auth/auth-layout';
import { AuthCard } from '@/components/auth/auth-card';
import { BrandQuote } from '@/components/auth/brand-quote';
import { LoginForm } from '@/components/forms/login-form';

export const metadata: Metadata = {
  title: 'Log in — Scorra',
};

export default function LoginPage() {
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
        eyebrow="Welcome back"
        title="Log in to Scorra"
        subtitle="Pick up your evaluation queue right where you left it."
      >
        <LoginForm />
      </AuthCard>
    </AuthLayout>
  );
}
