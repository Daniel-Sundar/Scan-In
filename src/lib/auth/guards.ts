import 'server-only';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import type { Role } from './policy';

export class AuthError extends Error {
  constructor(public code: 'unauthenticated' | 'forbidden' | 'window_closed', public status: 401 | 403) {
    super(code);
  }
}

export interface SessionUser { id: string; email: string; role: Role; fullName: string }

/** Defense in depth: middleware is the first gate, EVERY action/route re-checks here. */
export async function getSessionUser(): Promise<SessionUser | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase
    .from('users')
    .select('email,full_name,role,is_active')
    .eq('id', user.id)
    .single();
  if (!data?.is_active) return null;
  return { id: user.id, email: data.email, role: data.role, fullName: data.full_name };
}

/** For Server Actions / Route Handlers: throws, caller maps to HTTP status. */
export async function requireRole(role: Role): Promise<SessionUser> {
  const u = await getSessionUser();
  if (!u) throw new AuthError('unauthenticated', 401);
  if (u.role !== role) throw new AuthError('forbidden', 403);
  return u;
}

/** For Server Components / pages: redirects instead of throwing. */
export async function requirePage(role?: Role): Promise<SessionUser> {
  const u = await getSessionUser();
  if (!u) redirect('/login?reason=login_required');
  if (role && u.role !== role) redirect('/forbidden?reason=wrong_role');
  return u;
}

export interface LiveAllocation {
  id: string; exam_id: string; hall: string; starts_at: string; ends_at: string;
}

/** The caller's live allocation (RLS already filters by owner + time window).
 *  Returns null the instant the window closes. Call before every scan write. */
export async function requireLiveAllocation(allocationId: string): Promise<LiveAllocation> {
  const u = await requireRole('teacher');
  const supabase = await createClient();
  const { data } = await supabase
    .from('allocations')
    .select('id,exam_id,hall,starts_at,ends_at')
    .eq('id', allocationId)
    .eq('teacher_id', u.id) // explicit owner check on top of RLS (IDOR belt-and-braces)
    .maybeSingle<LiveAllocation>();
  if (!data) throw new AuthError('window_closed', 403);
  return data;
}

/** Map thrown AuthError to a JSON response in Route Handlers. */
export function authErrorResponse(e: unknown) {
  if (e instanceof AuthError) return Response.json({ error: e.code }, { status: e.status });
  throw e;
}
