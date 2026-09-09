import { z } from 'zod';

export const loginSchema = z.object({
  email: z
    .string()
    .min(1, 'Work email is required')
    .email('Enter a valid work email'),
  password: z.string().min(1, 'Password is required'),
  remember: z.boolean().optional(),
});

export const registerSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  email: z
    .string()
    .min(1, 'Work email is required')
    .email('Enter a valid work email'),
  password: z
    .string()
    .min(8, 'At least 8 characters')
    .regex(/[0-9]/, 'At least 1 number')
    .regex(/[^a-zA-Z0-9]/, 'At least 1 symbol'),
  organizationName: z.string().min(1, 'Organization name is required'),
  terms: z.boolean().refine((value) => value === true, {
    message: 'You must accept the Terms of Service',
  }),
});

export const forgotPasswordSchema = z.object({
  email: z
    .string()
    .min(1, 'Work email is required')
    .email('Enter a valid work email'),
});

export const resetPasswordSchema = z
  .object({
    password: z
      .string()
      .min(8, 'At least 8 characters')
      .regex(/[0-9]/, 'At least 1 number')
      .regex(/[^a-zA-Z0-9]/, 'At least 1 symbol'),
    confirmPassword: z.string().min(1, 'Confirm your password'),
  })
  .refine((values) => values.password === values.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Passwords do not match',
  });

export type LoginValues = z.infer<typeof loginSchema>;
export type RegisterValues = z.infer<typeof registerSchema>;
export type ForgotPasswordValues = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordValues = z.infer<typeof resetPasswordSchema>;
