import type { Metadata } from 'next';

import { AuthLayout } from '@/components/auth/auth-layout';
import { AuthCard } from '@/components/auth/auth-card';
import { BrandSteps } from '@/components/auth/brand-steps';
import { RegisterForm } from '@/components/forms/register-form';

export const metadata: Metadata = {
  title: 'Create your account — Scorra',
};

export default function RegisterPage() {
  return (
    <AuthLayout
      brand={<BrandSteps />}
      legal={
        <>
          Joining an existing team? Ask your admin for an invite link instead
          of registering here.
        </>
      }
    >
      <AuthCard
        eyebrow="Get started"
        title="Create your workspace"
        subtitle="Free for teams up to 5 evaluators — no credit card required."
      >
        <RegisterForm />
      </AuthCard>
    </AuthLayout>
  );
}
