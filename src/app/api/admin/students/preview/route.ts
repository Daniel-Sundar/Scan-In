import { authErrorResponse, requireRole } from '@/lib/auth/guards';
import { parseStudentFile } from '@/lib/ingest/parse';
import { createClient } from '@/lib/supabase/server';

/** Dry-run: parse + validate, report what WOULD happen. Writes nothing. */
export async function POST(req: Request) {
  try {
    await requireRole('admin');
    const file = (await req.formData().catch(() => null))?.get('file');
    if (!(file instanceof File)) return Response.json({ error: 'No file uploaded' }, { status: 400 });

    const res = await parseStudentFile(new Uint8Array(await file.arrayBuffer()), file.name);
    if ('error' in res) return Response.json(res, { status: 422 });

    // Which rows already exist (=> will be updated)?
    const supabase = await createClient();
    const existing = new Set<string>();
    for (let i = 0; i < res.rows.length; i += 500) {
      const { data } = await supabase.from('students').select('roll_no').in('roll_no', res.rows.slice(i, i + 500).map((r) => r.roll_no));
      data?.forEach((d: { roll_no: string }) => existing.add(d.roll_no));
    }
    return Response.json({
      kind: res.kind,
      total: res.total,
      valid: res.rows.length,
      toUpdate: existing.size,
      toCreate: res.rows.length - existing.size,
      errors: res.errors.slice(0, 100),
      errorCount: res.errors.length,
      sample: res.rows.slice(0, 20),
    });
  } catch (e) {
    return authErrorResponse(e);
  }
}
