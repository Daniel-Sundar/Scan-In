import { AllocationForm } from '@/components/admin/Forms';
import { RevokeButton } from '@/components/admin/Lists';
import { EmptyState, LiveBadge, PageHeader } from '@/components/ui/static';
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
  const status = (a: any) => a.revoked_at ? ['Revoked', 'badge-revoked'] : now < +new Date(a.starts_at) ? ['Upcoming', 'badge-upcoming'] : now < +new Date(a.ends_at) ? ['Live', 'badge-live'] : ['Ended', 'badge-ended'];
  const fmt = (s: string) => new Date(s).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });

  return (
    <div className="page space-y-8">
      <PageHeader eyebrow="Admin · Halls" title="Allocations" description="Give a teacher time-limited access to an exam hall." />
      <div className="grid gap-6 xl:grid-cols-[minmax(0,36rem)_1fr]">
        <section className="card-static"><p className="eyebrow">New</p><h2 className="mb-4 text-lg font-semibold">Assign a hall</h2>
          <AllocationForm teachers={teachers ?? []} departments={departments} /></section>
        <section>
          <p className="eyebrow">History</p><h2 className="mb-4 text-lg font-semibold">Recent allocations</h2>
          {!rows.length ? <EmptyState title="No allocations yet" body="Create one to give a teacher time-limited access to a hall." /> : (
            <ul className="space-y-3">{rows.map((a) => { const [label, cls] = status(a); return (
              <li key={a.id} className="card-static flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0"><p className="font-semibold"><span className="badge-mono mr-2">{a.exams?.code}</span>Hall {a.hall}</p>
                  <p className="text-sm text-muted">{a.users?.full_name} · {fmt(a.starts_at)} → {fmt(a.ends_at)}</p></div>
                <div className="flex items-center gap-2">{label === 'Live' ? <LiveBadge /> : <span className={cls}>{label}</span>}
                  {(label === 'Live' || label === 'Upcoming') && <RevokeButton id={a.id} />}</div>
              </li>); })}</ul>)}
        </section>
      </div>
    </div>
  );
}
