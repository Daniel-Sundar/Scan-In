'use server';

import { z } from 'zod';
import { getSessionUser } from '@/lib/auth/guards';
import { createClient } from '@/lib/supabase/server';
import type { FormState } from './types';

export async function submitContact(_: FormState, fd: FormData): Promise<FormState> {
  if (fd.get('website')) return { ok: true, message: 'Thanks, we will be in touch.' }; // honeypot
  const p = z.object({
    name: z.string().trim().min(1, 'Your name is required').max(120),
    email: z.string().trim().email('Enter a valid email').max(254),
    message: z.string().trim().min(5, 'Please write at least 5 characters').max(4000),
  }).safeParse(Object.fromEntries(fd));
  if (!p.success) return { errors: Object.fromEntries(p.error.issues.map((i) => [String(i.path[0]), i.message])) };
  if (fd.get('consent') !== 'on') return { errors: { consent: 'Please consent to us storing your message so we can reply' } };

  const supabase = await createClient();
  const { error } = await supabase.from('contact_messages').insert({ ...p.data, consent: true });
  if (error) return { message: 'Could not send your message. Please try again.' };
  return { ok: true, message: 'Message sent. We will reply to your email.' };
}

export async function requestDeletion(_: FormState, fd: FormData): Promise<FormState> {
  const user = await getSessionUser();
  if (!user) return { message: 'Please sign in to submit a deletion request.' };
  if (fd.get('confirm') !== 'on') return { errors: { confirm: 'Please confirm you understand' } };
  const reason = String(fd.get('reason') ?? '').slice(0, 1000);

  const supabase = await createClient();
  const { error } = await supabase.from('deletion_requests').insert({ user_id: user.id, reason: reason || null, status: 'pending' });
  if (error) return { message: 'Could not submit the request. Please try again.' };
  return { ok: true, message: 'Request received. An administrator will process it and confirm by email.' };
}
