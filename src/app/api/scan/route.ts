import { z } from 'zod';
import { AuthError, authErrorResponse, requireLiveAllocation } from '@/lib/auth/guards';
import { createClient } from '@/lib/supabase/server';

const Body = z.object({
  allocationId: z.string().uuid(),
  rollNo: z.string().regex(/^[A-Za-z0-9._-]{3,40}$/),
  clientScanId: z.string().uuid(),
  clientScannedAt: z.string().datetime().optional(),
  source: z.enum(['camera', 'manual', 'offline_sync']).default('camera'),
});

/** POST /api/scan  ->  { status: 'ok'|'duplicate'|'not_on_roster', student? }
 *  Auth, ownership and time-window are enforced twice: here and by RLS + triggers. */
export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: 'bad_request' }, { status: 400 });
  const b = parsed.data;

  try {
    const alloc = await requireLiveAllocation(b.allocationId);
    const supabase = await createClient();

    // RLS limits this to students rostered on the caller's live allocation.
    const { data: student } = await supabase
      .from('students')
      .select('id,full_name,roll_no,department')
      .eq('roll_no', b.rollNo)
      .maybeSingle();
    if (!student) return Response.json({ status: 'not_on_roster' }, { status: 404 });

    const { data: me } = await supabase.auth.getUser();
    const { error } = await supabase.from('attendance_logs').insert({
      allocation_id: alloc.id,
      exam_id: alloc.exam_id,
      student_id: student.id,
      teacher_id: me.user!.id,
      client_scan_id: b.clientScanId,
      client_scanned_at: b.clientScannedAt ?? null,
      source: b.source,
    });

    if (error?.code === '23505') {
      // Same student already checked in, or this exact scan was already replayed.
      return Response.json({ status: 'duplicate', student });
    }
    if (error?.code === '42501') throw new AuthError('window_closed', 403);
    if (error) return Response.json({ error: 'server_error' }, { status: 500 });

    return Response.json({ status: 'ok', student }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (e) {
    return authErrorResponse(e);
  }
}
