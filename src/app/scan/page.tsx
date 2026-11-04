import { redirect } from 'next/navigation';
import { EmptyState } from '@/components/ui/static';
import Scanner from '@/components/Scanner';
import { Roster, type RosterRow } from '@/components/teacher/Roster';
import { requireRole } from '@/lib/auth/guards';
import { createClient } from '@/lib/supabase/server';

export const metadata = { title: 'Scan attendance' };
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function ScanPage({ searchParams }: { searchParams: Promise<{ allocation?: string }> }) {
  await requireRole('teacher').catch(() => redirect('/forbidden?reason=teacher_only'));
  const supabase = await createClient();
  const { allocation } = await searchParams;

  const { data: live } = await supabase.from('allocations').select('id,hall,exams(code,title)').order('ends_at');
  /* eslint-disable @typescript-eslint/no-explicit-any */
  const list = (live ?? []) as any[];
  const chosen = allocation && UUID.test(allocation) ? list.find((a) => a.id === allocation) : list.length === 1 ? list[0] : null;
  if (!chosen) {
    if (list.length > 1) redirect('/dashboard');
    return <div className="page"><EmptyState title="No active allocation" body="You can scan only inside your allocated exam window." action={{ href: '/dashboard', label: 'Back to dashboard' }} /></div>;
  }

  const [{ data: links }, { data: logs }] = await Promise.all([
    supabase.from('allocation_students').select('students(id,roll_no,full_name,department)').eq('allocation_id', chosen.id).limit(5000),
    supabase.from('attendance_logs').select('student_id,scanned_at').eq('allocation_id', chosen.id),
  ]);
  const seen = new Map<string, string>((logs ?? []).map((l: any) => [l.student_id, l.scanned_at]));
  const rows: RosterRow[] = ((links ?? []) as any[]).filter((l) => l.students).map((l) => ({ ...l.students, at: seen.get(l.students.id) ?? null }))
    .sort((a, b) => a.roll_no.localeCompare(b.roll_no));

  return (
    <div className="page grid gap-8 lg:grid-cols-[minmax(0,28rem)_1fr]">
      <div className="no-print">
        <h1 className="h1 mb-1">{chosen.exams?.title}</h1>
        <p className="mb-4 text-muted">Hall {chosen.hall}</p>
        <Scanner allocationId={chosen.id} />
      </div>
      <Roster rows={rows} hall={chosen.hall} />
    </div>
  );
}
