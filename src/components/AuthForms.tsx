'use client';

import Link from 'next/link';
import { useActionState } from 'react';
import { login, register } from '@/lib/actions/auth';
import { initial } from '@/lib/actions/types';
import { Consent, Field, FormMessage, SubmitButton } from './ui/Form';

export function LoginForm({ next }: { next?: string }) {
  const [state, action] = useActionState(login, initial);
  const e = state.errors ?? {};
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="next" value={next ?? ''} />
      <Field label="Email" name="email" type="email" required autoComplete="email" error={e.email} />
      <Field label="Password" name="password" type="password" required minLength={8} autoComplete="current-password" error={e.password} />
      <FormMessage state={state} />
      <SubmitButton variant="btn-cta" pendingText="Signing in…">Sign in</SubmitButton>
      <p className="text-sm text-muted">Invigilator with a whitelisted email? <Link href="/register">Create your account</Link></p>
    </form>
  );
}

export function RegisterForm() {
  const [state, action] = useActionState(register, initial);
  const e = state.errors ?? {};
  if (state.ok) return <FormMessage state={state} />;
  return (
    <form action={action} className="space-y-3">
      <Field label="Full name" name="full_name" required minLength={2} maxLength={120} autoComplete="name" error={e.full_name} />
      <Field label="University email" name="email" type="email" required autoComplete="email" error={e.email} hint="Must be pre-approved by an administrator." />
      <Field label="Password" name="password" type="password" required minLength={10} autoComplete="new-password" error={e.password} hint="10+ characters, with a letter and a number." />
      <Consent error={e.consent}>I have read the <Link href="/privacy">Privacy Policy</Link> and <Link href="/terms">Terms of Service</Link> and consent to my details being processed.</Consent>
      <FormMessage state={state} />
      <SubmitButton variant="btn-cta" pendingText="Creating…">Create account</SubmitButton>
    </form>
  );
}
