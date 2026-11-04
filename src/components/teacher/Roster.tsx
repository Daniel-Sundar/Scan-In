'use client';

import { useMemo, useState } from 'react';
import { EmptyState } from '../ui/static';

export interface RosterRow { id: string; roll_no: string; full_name: string; department: string | null; at: string | null }

export function Roster({ rows, hall }: { rows: RosterRow[]; hall: string }) {
  const [q, setQ] = useState('');
  const [onlyMissing, setOnlyMissing] = useState(false);
  const shown = useMemo(() => {
    const n = q.trim().toLowerCase();
    return rows.filter((r) => (!onlyMissing || !r.at) && (!n || `${r.roll_no} ${r.full_name}`.toLowerCase().includes(n)));
  }, [rows, q, onlyMissing]);
  const present = rows.filter((r) => r.at).length;

  if (!rows.length) return <EmptyState title="No students assigned" body="The administrator hasn’t added any students to this hall yet." />;
  return (
    <section aria-labelledby="roster-h" className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="roster-h" className="text-lg font-semibold">Roster · {hall}</h2>
        <p className="text-sm text-muted">{present} / {rows.length} present</p>
      </div>
      <div className="no-print flex flex-col gap-3 sm:flex-row">
        <label htmlFor="roster-q" className="sr-only">Search roster</label>
        <input id="roster-q" type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name or roll no" className="input" />
        <label className="flex min-h-[44px] items-center gap-2 whitespace-nowrap text-sm"><input type="checkbox" className="h-5 w-5 accent-cobalt" checked={onlyMissing} onChange={(e) => setOnlyMissing(e.target.checked)} /> Absent only</label>
        <button className="btn-ghost" onClick={() => window.print()}>Print</button>
      </div>
      {!shown.length ? <EmptyState title="No results" body="No student matches the current search or filter." /> : (
        <ul className="grid gap-2 sm:grid-cols-2" aria-live="polite">
          {shown.map((r) => (
            <li key={r.id} className={`flex items-center justify-between gap-3 rounded-xl border p-3 ${r.at ? 'border-lime-soft bg-lime/10' : 'border-line bg-surface'}`}>
              <div className="min-w-0"><p className="truncate font-medium">{r.full_name}</p><p className="font-mono text-xs text-muted">{r.roll_no}</p></div>
              <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${r.at ? 'bg-lime text-midnight' : 'bg-line text-muted'}`}>
                {r.at ? `✓ ${new Date(r.at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : 'Absent'}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
