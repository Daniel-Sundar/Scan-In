'use client';

import { useEffect, useMemo, useState } from 'react';
import { processDeletion, removeWhitelist, revokeAllocation } from '@/lib/actions/admin';
import { EmptyState, Skeleton } from '../ui/static';
import { LastUpdated } from '../ui/Chrome';
import { ConfirmButton } from '../ui/Modal';

interface S { id: string; roll_no: string; full_name: string; department: string | null; year: number | null }

/** Live client-side search over the loaded list, with empty + no-result states. */
export function StudentTable({ students }: { students: S[] }) {
  const [q, setQ] = useState('');
  const rows = useMemo(() => {
    const n = q.trim().toLowerCase();
    return n ? students.filter((s) => `${s.roll_no} ${s.full_name} ${s.department ?? ''}`.toLowerCase().includes(n)) : students;
  }, [q, students]);

  if (!students.length) return <EmptyState title="No students yet" body="Upload a file or add a student above to get started." />;
  return (
    <div className="space-y-3">
      <div className="no-print">
        <label htmlFor="student-search" className="sr-only">Search students</label>
        <input id="student-search" type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name, roll no or department" className="input" />
        <p className="mt-1 text-xs text-muted" aria-live="polite">{rows.length} of {students.length} shown</p>
      </div>
      {!rows.length ? <EmptyState title="No matching students" body={`Nothing matches “${q}”. Check the spelling or clear the search.`} /> : (
        <div className="glass-table-wrap">
          <table className="glass-table">
            <caption className="sr-only">Students</caption>
            <thead><tr><th>Roll no</th><th>Name</th><th className="hidden sm:table-cell">Department</th><th className="hidden sm:table-cell">Year</th></tr></thead>
            <tbody>{rows.slice(0, 300).map((s) => (
              <tr key={s.id}>
                <td><span className="badge-mono">{s.roll_no}</span></td><td className="font-medium">{s.full_name}</td>
                <td className="hidden sm:table-cell">{s.department ?? '—'}</td><td className="hidden sm:table-cell">{s.year ?? '—'}</td>
              </tr>))}</tbody>
          </table>
          {rows.length > 300 && <p className="border-t border-line p-3 text-xs text-muted">Showing first 300. Refine the search to see more.</p>}
        </div>
      )}
    </div>
  );
}

interface Item { id: string; at: string; kind: 'scan' | 'system' | 'alert'; text: string }
const DOT = { scan: 'bg-[#CCFF00] shadow-[0_0_8px_rgba(204,255,0,0.6)]', system: 'bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.6)]', alert: 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.6)]' } as const;

/** Polls every 10s. Pauses while the tab is hidden or the device is offline. */
export function ActivityFeed() {
  const [items, setItems] = useState<Item[] | null>(null);
  const [at, setAt] = useState<string | null>(null);
  const [err, setErr] = useState(false);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      if (document.visibilityState !== 'visible' || !navigator.onLine) return;
      try {
        const r = await fetch('/api/admin/activity', { cache: 'no-store' });
        if (!r.ok) throw new Error();
        const j = await r.json();
        if (alive) { setItems(j.items); setAt(j.at); setErr(false); }
      } catch { if (alive) setErr(true); }
    };
    void load();
    const t = setInterval(load, 10000);
    return () => { alive = false; clearInterval(t); };
  }, []);

  return (
    <section aria-labelledby="feed-h" className="card-static">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div><p className="eyebrow">Realtime</p><h2 id="feed-h" className="text-lg font-semibold">Live activity</h2></div>
        <LastUpdated at={at} />
      </div>
      {err && <p role="alert" className="mb-3 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-500">Couldn’t refresh. Retrying automatically…</p>}
      {items === null ? <div className="space-y-2">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-10" />)}</div>
        : items.length === 0 ? <p className="py-6 text-center text-sm text-muted">No activity yet. Scans will appear here as they happen.</p>
        : <ul className="max-h-96 space-y-1 overflow-auto" aria-live="polite">{items.map((i) => (
            <li key={i.id} className="flex items-start gap-3 rounded-lg px-2 py-2 text-sm hover:bg-blue-500/5 transition-colors">
              <span aria-hidden className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${DOT[i.kind]}`} />
              <span className="flex-1">{i.text}</span>
              <time className="shrink-0 text-xs text-muted" dateTime={i.at}>{new Date(i.at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</time>
            </li>))}</ul>}
    </section>
  );
}

export const RevokeButton = ({ id }: { id: string }) => (
  <ConfirmButton label="Revoke" title="Revoke this allocation?" confirmLabel="Revoke now" className="btn-danger"
    body="The teacher loses access immediately. Attendance already recorded is kept." action={() => revokeAllocation(id)} />
);
export const RemoveWhitelistButton = ({ email }: { email: string }) => (
  <ConfirmButton label="Remove" title={`Remove ${email}?`} confirmLabel="Remove" className="btn-danger"
    body="This address will no longer be able to register. Existing accounts are unaffected." action={() => removeWhitelist(email)} />
);
export const ProcessDeletionButton = ({ id }: { id: string }) => (
  <ConfirmButton label="Process" title="Anonymise this account?" confirmLabel="Anonymise" className="btn-ghost"
    body="The user’s name and email are irreversibly anonymised and the account disabled. Attendance records stay for exam integrity." action={() => processDeletion(id)} />
);
