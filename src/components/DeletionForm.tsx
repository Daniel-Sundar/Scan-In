'use client';

import { useActionState } from 'react';
import { requestDeletion } from '@/lib/actions/public';
import { initial } from '@/lib/actions/types';
import { Consent, FormMessage, SubmitButton } from './ui/Form';

export function DeletionForm({ email }: { email: string }) {
  const [state, action] = useActionState(requestDeletion, initial);
  if (state.ok) return <FormMessage state={state} />;
  return (
    <form action={action} className="space-y-3">
      <p className="text-sm">Account: <strong>{email}</strong></p>
      <div><label htmlFor="reason" className="label">Reason (optional)</label><textarea id="reason" name="reason" rows={3} maxLength={1000} className="input py-3" /></div>
      <Consent name="confirm" error={state.errors?.confirm}>I understand this will disable my account and cannot be undone.</Consent>
      <FormMessage state={state} />
      <SubmitButton variant="btn-danger" pendingText="Submitting…">Request deletion</SubmitButton>
    </form>
  );
}
