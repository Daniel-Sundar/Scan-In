import { authErrorResponse, requireRole } from '@/lib/auth/guards';
import { createClient } from '@/lib/supabase/server';

/** Live feed for the admin dashboard: recent scans + audit events, newest first. */
export async function GET() {
  try {
    await requireRole('admin');
    const supabase = await createClient();
    const [scans, events] = await Promise.all([
      supabase.from('attendance_logs')
        .select('id,scanned_at,source,students(full_name,roll_no),allocations(hall)')
        .order('scanned_at', { ascending: false }).limit(15),
      supabase.from('audit_events').select('id,action,created_at,meta').order('created_at', { ascending: false }).limit(15),
    ]);
    /* eslint-disable @typescript-eslint/no-explicit-any */
    const items = [
      ...(scans.data ?? []).map((s: any) => ({
        id: `s${s.id}`, at: s.scanned_at, kind: 'scan' as const,
        text: `${s.students?.full_name ?? 'Student'} (${s.students?.roll_no ?? '?'}) checked in · ${s.allocations?.hall ?? 'hall'}`,
      })),
      ...(events.data ?? []).map((e: any) => ({
        id: `e${e.id}`, at: e.created_at,
        kind: /fail|denied/.test(e.action) ? ('alert' as const) : ('system' as const),
        text: e.action.replace(/[._]/g, ' '),
      })),
    ].sort((a, b) => +new Date(b.at) - +new Date(a.at)).slice(0, 25);
    return Response.json({ items, at: new Date().toISOString() }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (e) {
    return authErrorResponse(e);
  }
}
