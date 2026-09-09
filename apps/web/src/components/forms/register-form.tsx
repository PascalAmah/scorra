'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { motion } from 'motion/react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';

import { AuthFooter } from '@/components/auth/auth-footer';
import { FormField } from '@/components/auth/form-field';
import { PasswordInput } from '@/components/auth/password-input';
import { SubmitButton } from '@/components/auth/submit-button';
import { fadeUpContainer, fadeUpItem } from '@/components/auth/motion-variants';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { signUp } from '@/services/auth-service';
import { registerSchema, type RegisterValues } from '@/validations/auth';

export function RegisterForm() {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      password: '',
      organizationName: '',
      terms: false,
    },
  });

  const onSubmit = async (values: RegisterValues) => {
    setServerError(null);
    try {
      await signUp(values);
      router.push('/dashboard');
    } catch (error) {
      setServerError(
        error instanceof Error ? error.message : 'Unable to create your account. Please try again.',
      );
    }
  };

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

      <motion.div variants={fadeUpItem} className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <FormField label="First name" htmlFor="firstName" error={errors.firstName?.message}>
          <Input
            id="firstName"
            type="text"
            placeholder="Jordan"
            autoComplete="given-name"
            invalid={!!errors.firstName}
            {...register('firstName')}
          />
        </FormField>
        <FormField label="Last name" htmlFor="lastName" error={errors.lastName?.message}>
          <Input
            id="lastName"
            type="text"
            placeholder="Reyes"
            autoComplete="family-name"
            invalid={!!errors.lastName}
            {...register('lastName')}
          />
        </FormField>
      </motion.div>

      <motion.div variants={fadeUpItem}>
        <FormField label="Work email" htmlFor="email" error={errors.email?.message}>
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
        <FormField
          label="Password"
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

      <motion.div
        variants={fadeUpItem}
        className="mb-4 mt-6 flex items-center gap-2.5 font-mono text-[11px] uppercase tracking-[0.08em] text-ink-400"
      >
        <span>Your organization</span>
        <span className="h-px flex-1 bg-ink-200" />
      </motion.div>

      <motion.div variants={fadeUpItem}>
        <FormField
          label="Organization name"
          htmlFor="organizationName"
          hint="YOU'LL BE ASSIGNED ORG_ADMIN"
          error={errors.organizationName?.message}
        >
          <Input
            id="organizationName"
            type="text"
            placeholder="e.g. Northbeam AI"
            invalid={!!errors.organizationName}
            {...register('organizationName')}
          />
        </FormField>
      </motion.div>

      <motion.div variants={fadeUpItem}>
        <div className="mb-5.5 mt-6 flex items-start gap-2.5 text-[12.5px] leading-normal text-ink-500">
          <Checkbox id="terms" className="mt-0.5" invalid={!!errors.terms} {...register('terms')} />
          <div>
            <label htmlFor="terms" className="cursor-pointer select-none">
              I agree to Scorra&rsquo;s{' '}
              <a href="/terms" className="font-semibold text-ink hover:underline">
                Terms of Service
              </a>{' '}
              and{' '}
              <a href="/privacy" className="font-semibold text-ink hover:underline">
                Privacy Policy
              </a>
              .
            </label>
            {errors.terms?.message && (
              <p role="alert" className="mt-1 text-[11.5px] text-red-600">
                {errors.terms.message}
              </p>
            )}
          </div>
        </div>
      </motion.div>

      <motion.div variants={fadeUpItem}>
        <SubmitButton loading={isSubmitting}>Create account</SubmitButton>
      </motion.div>

      <motion.div variants={fadeUpItem}>
        <AuthFooter>
          Already have an account?{' '}
          <a href="/login" className="font-semibold text-ink transition-colors hover:underline">
            Log in
          </a>
        </AuthFooter>
      </motion.div>
    </motion.form>
  );
}
