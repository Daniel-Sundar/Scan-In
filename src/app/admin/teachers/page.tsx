import { WhitelistForm } from '@/components/admin/Forms';
import { RemoveWhitelistButton } from '@/components/admin/Lists';
import { CopyButton } from '@/components/ui/Chrome';
import { EmptyState } from '@/components/ui/static';
import { requirePage } from '@/lib/auth/guards';
import { createClient } from '@/lib/supabase/server';

export const metadata = { title: 'Teachers' };

export default async function Teachers() {
  await requirePage('admin');
  const supabase = await createClient();
  const [{ data: wl }, { data: users }] = await Promise.all([
    supabase.from('teacher_whitelist').select('email,created_at').order('created_at', { ascending: false }),
    supabase.from('users').select('email,full_name,is_active').eq('role', 'teacher'),
  ]);
  const registered = new Map((users ?? []).map((u: { email: string; full_name: string; is_active: boolean }) => [u.email.toLowerCase(), u]));
  return (
    <div className="page space-y-8">
      <h1 className="h1">Teachers</h1>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,26rem)_1fr]">
        <section className="card-static"><h2 className="mb-4 text-lg font-semibold">Approve an invigilator</h2><WhitelistForm /></section>
        <section>
          <h2 className="mb-4 text-lg font-semibold">Whitelisted emails</h2>
          {!wl?.length ? <EmptyState title="No teachers yet" body="Whitelist an email so the teacher can register." /> : (
            <ul className="space-y-2">{wl.map((w: { email: string }) => {
              const u = registered.get(w.email.toLowerCase());
              return (
                <li key={w.email} className="card-static flex flex-wrap items-center justify-between gap-3 py-3 sm:py-3">
                  <div className="min-w-0"><p className="truncate font-medium">{w.email}</p>
                    <p className="text-xs text-muted">{u ? `Registered · ${u.full_name}${u.is_active ? '' : ' (disabled)'}` : 'Awaiting registration'}</p></div>
                  <div className="flex gap-2"><CopyButton text={w.email} /><RemoveWhitelistButton email={w.email} /></div>
                </li>);
            })}</ul>)}
        </section>
      </div>
    </div>
  );
}
