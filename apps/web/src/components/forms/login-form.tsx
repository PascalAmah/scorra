'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { motion } from 'motion/react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';

import { AuthFooter } from '@/components/auth/auth-footer';
// import { Divider } from '@/components/auth/divider';
import { FormField } from '@/components/auth/form-field';
import { PasswordInput } from '@/components/auth/password-input';
// import { SocialButton } from '@/components/auth/social-button';
import { SubmitButton } from '@/components/auth/submit-button';
import {
  fadeUpContainer,
  fadeUpItem,
} from '@/components/auth/motion-variants';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { signIn } from '@/services/auth-service';
import { loginSchema, type LoginValues } from '@/validations/auth';

export function LoginForm() {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '', remember: false },
  });

  const onSubmit = async (values: LoginValues) => {
    setServerError(null);
    try {
      const session = await signIn(values);
      router.push('/dashboard');
    } catch (error) {
      setServerError(
        error instanceof Error ? error.message : 'Unable to log in. Please try again.',
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
          error={errors.password?.message}
          action={
            <a
              href="#"
              className="text-xs font-medium text-ink-500 transition-colors hover:text-ink"
            >
              Forgot password?
            </a>
          }
        >
          <PasswordInput
            id="password"
            placeholder="••••••••"
            autoComplete="current-password"
            invalid={!!errors.password}
            {...register('password')}
          />
        </FormField>
      </motion.div>

      <motion.div
        variants={fadeUpItem}
        className="mb-7 flex items-center gap-2 text-[13px] text-ink-500"
      >
        <Checkbox id="remember" {...register('remember')} />
        <label htmlFor="remember" className="cursor-pointer select-none">
          Keep me signed in on this device
        </label>
      </motion.div>

      <motion.div variants={fadeUpItem}>
        <SubmitButton loading={isSubmitting}>Log in</SubmitButton>
      </motion.div>

      {/* <motion.div variants={fadeUpItem}>
        <Divider>or</Divider>
        <SocialButton>Continue with SSO</SocialButton>
      </motion.div> */}

      <motion.div variants={fadeUpItem}>
        <AuthFooter>
          Don&rsquo;t have an account?{' '}
          <a
            href="/register"
            className="font-semibold text-ink transition-colors hover:underline"
          >
            Create one free
          </a>
        </AuthFooter>
      </motion.div>
    </motion.form>
  );
}
