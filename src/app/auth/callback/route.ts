import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/** Email-verification landing: exchanges the one-time code for a session. */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL('/dashboard', url.origin));
  }
  return NextResponse.redirect(new URL('/login?reason=verify_failed', url.origin));
}
