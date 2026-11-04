import { AllocationForm } from '@/components/admin/Forms';
import { RevokeButton } from '@/components/admin/Lists';
import { EmptyState } from '@/components/ui/static';
import { requirePage } from '@/lib/auth/guards';
import { createClient } from '@/lib/supabase/server';

export const metadata = { title: 'Allocations' };

export default async function Allocations() {
  await requirePage('admin');
  const supabase = await createClient();
  const [{ data: teachers }, { data: depts }, { data: allocs }] = await Promise.all([
    supabase.from('users').select('id,full_name,email').eq('role', 'teacher').eq('is_active', true).order('full_name'),
    supabase.from('students').select('department').not('department', 'is', null).limit(5000),
    supabase.from('allocations').select('id,hall,starts_at,ends_at,revoked_at,users!allocations_teacher_id_fkey(full_name),exams(code,title)').order('starts_at', { ascending: false }).limit(50),
  ]);
  const departments = [...new Set((depts ?? []).map((d: { department: string }) => d.department))].sort();
  /* eslint-disable @typescript-eslint/no-explicit-any */
  const rows = (allocs ?? []) as any[];
  const now = Date.now();
  const status = (a: any) => a.revoked_at ? ['Revoked', 'bg-red-500 text-white'] : now < +new Date(a.starts_at) ? ['Upcoming', 'bg-cobalt text-white'] : now < +new Date(a.ends_at) ? ['Live', 'bg-lime text-midnight'] : ['Ended', 'bg-line text-muted'];
  const fmt = (s: string) => new Date(s).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });

  return (
    <div className="page space-y-8">
      <h1 className="h1">Allocations</h1>
      <div className="grid gap-6 xl:grid-cols-[minmax(0,34rem)_1fr]">
        <section className="card-static"><h2 className="mb-4 text-lg font-semibold">Assign a hall</h2>
          <AllocationForm teachers={teachers ?? []} departments={departments} /></section>
        <section>
          <h2 className="mb-4 text-lg font-semibold">Recent allocations</h2>
          {!rows.length ? <EmptyState title="No allocations yet" body="Create one to give a teacher time-limited access to a hall." /> : (
            <ul className="space-y-3">{rows.map((a) => { const [label, cls] = status(a); return (
              <li key={a.id} className="card-static flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0"><p className="font-semibold">{a.exams?.code} · Hall {a.hall}</p>
                  <p className="text-sm text-muted">{a.users?.full_name} · {fmt(a.starts_at)} → {fmt(a.ends_at)}</p></div>
                <div className="flex items-center gap-2"><span className={`rounded-full px-3 py-1 text-xs font-bold ${cls}`}>{label}</span>
                  {(label === 'Live' || label === 'Upcoming') && <RevokeButton id={a.id} />}</div>
              </li>); })}</ul>)}
        </section>
      </div>
    </div>
  );
}
