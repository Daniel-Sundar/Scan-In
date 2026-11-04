import Link from 'next/link';
import { ActivityFeed, ProcessDeletionButton } from '@/components/admin/Lists';
import { EmptyState, StatCard } from '@/components/ui/static';
import { requirePage } from '@/lib/auth/guards';
import { createClient } from '@/lib/supabase/server';

export const metadata = { title: 'Dashboard' };

export default async function Dashboard() {
  const user = await requirePage();
  return (
    <div className="page space-y-8">
      <div><h1 className="h1">Welcome, {user.fullName.split(' ')[0]}</h1><p className="mt-1 text-muted">{user.role === 'admin' ? 'System overview' : 'Your active exam halls'}</p></div>
      {user.role === 'admin' ? <AdminView /> : <TeacherView />}
    </div>
  );
}

async function AdminView() {
  const supabase = await createClient();
  const head = { count: 'exact' as const, head: true };
  const dayStart = new Date(); dayStart.setHours(0, 0, 0, 0);
  const now = new Date().toISOString();
  const [students, teachers, live, scans, dels] = await Promise.all([
    supabase.from('students').select('id', head),
    supabase.from('users').select('id', head).eq('role', 'teacher').eq('is_active', true),
    supabase.from('allocations').select('id', head).is('revoked_at', null).lte('starts_at', now).gt('ends_at', now),
    supabase.from('attendance_logs').select('id', head).gte('scanned_at', dayStart.toISOString()),
    supabase.from('deletion_requests').select('id,reason,created_at,users(full_name,email)').eq('status', 'pending').order('created_at').limit(10),
  ]);
  /* eslint-disable @typescript-eslint/no-explicit-any */
  const pending = (dels.data ?? []) as any[];
  return (
    <>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Students" value={students.count ?? 0} />
        <StatCard label="Active teachers" value={teachers.count ?? 0} />
        <StatCard label="Halls live now" value={live.count ?? 0} hint="Inside their time window" />
        <StatCard label="Scans today" value={scans.count ?? 0} />
      </div>
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2"><ActivityFeed /></div>
        <div className="space-y-6">
          <section className="card-static"><h2 className="mb-3 text-lg font-semibold">Quick actions</h2>
            <div className="grid gap-2"><Link href="/admin/students" className="btn-primary">Import students</Link><Link href="/admin/teachers" className="btn-ghost">Manage teachers</Link><Link href="/admin/allocations" className="btn-cta">New allocation</Link></div></section>
          <section className="card-static"><h2 className="mb-3 text-lg font-semibold">Deletion requests</h2>
            {!pending.length ? <p className="text-sm text-muted">No pending requests.</p> : <ul className="space-y-3">{pending.map((d) => (
              <li key={d.id} className="flex items-center justify-between gap-3 text-sm"><span className="min-w-0"><span className="block truncate font-medium">{d.users?.full_name}</span><span className="block truncate text-xs text-muted">{d.users?.email}</span></span><ProcessDeletionButton id={d.id} /></li>))}</ul>}</section>
        </div>
      </div>
    </>
  );
}

async function TeacherView() {
  const supabase = await createClient();
  // RLS returns ONLY this teacher's allocations that are inside their window.
  const { data } = await supabase.from('allocations').select('id,hall,starts_at,ends_at,exams(code,title)').order('ends_at');
  const rows = (data ?? []) as any[];
  if (!rows.length) return <EmptyState title="No active hall right now" body="Your access opens at the start time your administrator set, and closes automatically at the end. Check back then." action={{ href: '/contact', label: 'Contact administrator' }} />;
  return (
    <div className="grid gap-4 md:grid-cols-2">{rows.map((a) => (
      <div key={a.id} className="card">
        <p className="text-xs font-semibold uppercase tracking-wide text-link">{a.exams?.code}</p>
        <h2 className="mt-1 text-xl font-bold">{a.exams?.title}</h2>
        <p className="mt-1 text-muted">Hall {a.hall}</p>
        <p className="mt-3 text-sm">Closes at <strong>{new Date(a.ends_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</strong></p>
        <Link href={`/scan?allocation=${a.id}`} className="btn-cta mt-4 w-full">Open scanner</Link>
      </div>))}</div>
  );
}
