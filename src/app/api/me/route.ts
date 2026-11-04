import { getSessionUser } from '@/lib/auth/guards';

/** Cheap session probe used by <SessionWatcher/>. */
export async function GET() {
  const u = await getSessionUser();
  if (!u) return Response.json({ error: 'unauthenticated' }, { status: 401 });
  return Response.json({ role: u.role }, { headers: { 'Cache-Control': 'no-store' } });
}
