import { audit } from '@/lib/audit';
import { authErrorResponse, requireRole } from '@/lib/auth/guards';
import { parseStudentFile } from '@/lib/ingest/parse';
import { createClient } from '@/lib/supabase/server';

/** Commit: the file is RE-PARSED here. We never trust rows sent back from the browser. */
export async function POST(req: Request) {
  try {
    const admin = await requireRole('admin');
    const file = (await req.formData().catch(() => null))?.get('file');
    if (!(file instanceof File)) return Response.json({ error: 'No file uploaded' }, { status: 400 });

    const res = await parseStudentFile(new Uint8Array(await file.arrayBuffer()), file.name);
    if ('error' in res) return Response.json(res, { status: 422 });
    if (!res.rows.length) return Response.json({ error: 'No valid rows to import' }, { status: 422 });

    const supabase = await createClient();
    let imported = 0;
    for (let i = 0; i < res.rows.length; i += 500) {
      const chunk = res.rows.slice(i, i + 500).map((r) => ({ ...r, created_by: admin.id }));
      const { error } = await supabase.from('students').upsert(chunk, { onConflict: 'roll_no' });
      if (error) {
        await audit(admin.id, 'students.import_failed', 'students', undefined, { imported, at: i });
        return Response.json({ error: `Import stopped after ${imported} rows`, imported }, { status: 500 });
      }
      imported += chunk.length;
    }
    await audit(admin.id, 'students.import', 'students', undefined, { kind: res.kind, imported, skipped: res.errors.length });
    return Response.json({ imported, skipped: res.errors.length });
  } catch (e) {
    return authErrorResponse(e);
  }
}
