import { authErrorResponse, requireLiveAllocation } from '@/lib/auth/guards';

/** Lightweight heartbeat the scanner polls: returns remaining ms in the window so the UI
 *  can show a countdown and lock itself. The server remains the authority. */
export async function GET(req: Request) {
  const id = new URL(req.url).searchParams.get('allocation');
  if (!id || !/^[0-9a-f-]{36}$/i.test(id)) return Response.json({ error: 'bad_request' }, { status: 400 });
  try {
    const a = await requireLiveAllocation(id);
    return Response.json(
      { allocation: a.id, hall: a.hall, remainingMs: new Date(a.ends_at).getTime() - Date.now() },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (e) {
    return authErrorResponse(e);
  }
}
