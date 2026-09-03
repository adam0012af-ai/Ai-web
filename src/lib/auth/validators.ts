import { z } from 'zod';

export const registerSchema = z
  .object({
    name: z.string().trim().min(2).max(80),
    email: z.string().trim().toLowerCase().email().max(160),
    password: z
      .string()
      .min(10)
      .max(128)
      .regex(/[A-Z]/, 'Add an uppercase letter')
      .regex(/[a-z]/, 'Add a lowercase letter')
      .regex(/\d/, 'Add a number'),
    confirmPassword: z.string(),
    terms: z.boolean().refine((value) => value === true, {
      message: 'You must agree to the Terms & Privacy Policy',
    }),
  })
  .refine((value) => value.password === value.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Passwords do not match',
  });

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1),
  remember: z.boolean(),
});

export const forgotSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
});

export const resetSchema = z.object({
  token: z.string().min(20),
  password: z
    .string()
    .min(10)
    .max(128)
    .regex(/[A-Z]/)
    .regex(/[a-z]/)
    .regex(/\d/),
});
