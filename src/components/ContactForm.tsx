'use client';

import Link from 'next/link';
import { useActionState } from 'react';
import { submitContact } from '@/lib/actions/public';
import { initial } from '@/lib/actions/types';
import { Consent, Field, FormMessage, SubmitButton } from './ui/Form';

export function ContactForm({ compact = false }: { compact?: boolean }) {
  const [state, action] = useActionState(submitContact, initial);
  const e = state.errors ?? {};
  if (state.ok) return <FormMessage state={state} />;
  return (
    <form action={action} className="space-y-3" noValidate={false}>
      <input type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden className="hidden" />
      <Field label="Your name" name="name" required maxLength={120} autoComplete="name" error={e.name} />
      <Field label="Email" name="email" type="email" required autoComplete="email" error={e.email} />
      <div>
        <label htmlFor="f-message" className="label">Message <span aria-hidden className="text-red-500">*</span></label>
        <textarea id="f-message" name="message" required minLength={5} maxLength={4000} rows={compact ? 3 : 5}
          aria-invalid={!!e.message} className={`input py-3 ${e.message ? 'input-bad' : ''}`} />
        {e.message && <p role="alert" className="mt-1 text-xs text-red-500">{e.message}</p>}
      </div>
      <Consent error={e.consent}>I agree that ScanIn stores my message to reply to me, as described in the <Link href="/privacy">Privacy Policy</Link>.</Consent>
      <FormMessage state={state} />
      <SubmitButton variant="btn-cta" pendingText="Sending…">Send message</SubmitButton>
    </form>
  );
}
