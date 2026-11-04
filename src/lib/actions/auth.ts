'use server';

import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import type { FormState } from './types';

const Email = z.string().trim().toLowerCase().email('Enter a valid email address').max(254);
const safeNext = (n: unknown) => (typeof n === 'string' && /^\/(?!\/)[\w\-/?=&%.]*$/.test(n) ? n : '/dashboard');

export async function login(_: FormState, fd: FormData): Promise<FormState> {
  const email = Email.safeParse(fd.get('email'));
  const password = String(fd.get('password') ?? '');
  if (!email.success) return { errors: { email: email.error.issues[0].message } };
  if (password.length < 8) return { errors: { password: 'Password must be at least 8 characters' } };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email: email.data, password });
  if (error) {
    if (/not confirmed/i.test(error.message)) return { message: 'Please verify your email first. Check your inbox for the confirmation link.' };
    return { message: 'Invalid email or password.' }; // generic: no account enumeration
  }
  redirect(safeNext(fd.get('next')));
}

export async function register(_: FormState, fd: FormData): Promise<FormState> {
  const email = Email.safeParse(fd.get('email'));
  const name = String(fd.get('full_name') ?? '').trim();
  const password = String(fd.get('password') ?? '');
  const errors: Record<string, string> = {};
  if (!email.success) errors.email = email.error.issues[0].message;
  if (name.length < 2 || name.length > 120) errors.full_name = 'Enter your full name';
  if (password.length < 10 || !/[A-Za-z]/.test(password) || !/\d/.test(password)) errors.password = 'At least 10 characters with a letter and a number';
  if (fd.get('consent') !== 'on') errors.consent = 'You must accept the Privacy Policy and Terms to register';
  if (Object.keys(errors).length) return { errors };

  const h = await headers();
  const origin = process.env.NEXT_PUBLIC_SITE_URL ?? `${h.get('x-forwarded-proto') ?? 'http'}://${h.get('host')}`;
  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    email: email.data!,
    password,
    options: { data: { full_name: name, consent: 'true' }, emailRedirectTo: `${origin}/auth/callback` },
  });
  if (error) {
    // DB trigger raises for non-whitelisted emails
    if (/not authori|database error/i.test(error.message)) return { errors: { email: 'This email is not authorised. Ask your administrator to add it.' } };
    return { message: 'Could not create the account. Please try again.' };
  }
  return { ok: true, message: 'Check your inbox and click the verification link to activate your account.' };
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect('/login');
}
