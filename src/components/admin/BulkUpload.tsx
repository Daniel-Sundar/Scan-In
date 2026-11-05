'use client';

import { useRouter } from 'next/navigation';
import { useRef, useState } from 'react';

interface Preview {
  kind: string; total: number; valid: number; toCreate: number; toUpdate: number;
  errorCount: number; errors: { row: number; message: string }[];
  sample: { roll_no: string; full_name: string; department: string | null; year: number | null }[];
}
type Stage = 'idle' | 'checking' | 'preview' | 'importing' | 'done' | 'error';

const MAX = 5 * 1024 * 1024;

export function BulkUpload() {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [stage, setStage] = useState<Stage>('idle');
  const [pv, setPv] = useState<Preview | null>(null);
  const [msg, setMsg] = useState('');
  const [drag, setDrag] = useState(false);

  const pick = async (f: File | undefined | null) => {
    if (!f) return;
    setMsg(''); setPv(null);
    if (!/\.(csv|xlsx|pdf)$/i.test(f.name)) { setStage('error'); setMsg('Choose a .csv, .xlsx or .pdf file.'); return; }
    if (f.size > MAX) { setStage('error'); setMsg('File is larger than 5 MB.'); return; }
    setFile(f); setStage('checking');
    const fd = new FormData(); fd.append('file', f);
    try {
      const r = await fetch('/api/admin/students/preview', { method: 'POST', body: fd });
      const j = await r.json();
      if (!r.ok) { setStage('error'); setMsg(j.error ?? 'Could not read the file.'); return; }
      setPv(j); setStage('preview');
    } catch { setStage('error'); setMsg('Network error. Check your connection and try again.'); }
  };

  const commit = async () => {
    if (!file) return;
    setStage('importing');
    const fd = new FormData(); fd.append('file', file);
    try {
      const r = await fetch('/api/admin/students/import', { method: 'POST', body: fd });
      const j = await r.json();
      if (!r.ok) { setStage('error'); setMsg(j.error ?? 'Import failed.'); return; }
      setMsg(`${j.imported} students imported${j.skipped ? `, ${j.skipped} rows skipped` : ''}.`);
      setStage('done'); router.refresh();
    } catch { setStage('error'); setMsg('Network error during import. Nothing further was saved.'); }
  };

  const reset = () => { setFile(null); setPv(null); setStage('idle'); setMsg(''); if (input.current) input.current.value = ''; };

  return (
    <div className="space-y-4">
      <div
        onDragOver={(e) => { e.preventDefault(); setDrag(true); }} onDragLeave={() => setDrag(false)}
        onDrop={(e) => { e.preventDefault(); setDrag(false); void pick(e.dataTransfer.files[0]); }}
        className={`dropzone group ${drag ? '!border-blue-400 !bg-blue-500/15' : ''}`}>
        <svg aria-hidden width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
          className="mx-auto mb-3 text-blue-500 group-hover:animate-bounce-soft"><path d="M12 16V4M7 9l5-5 5 5" /><path d="M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3" /></svg>
        <p className="font-medium">Drop a file here, or</p>
        <label className="btn-primary mt-3 cursor-pointer">
          Choose file
          <input ref={input} type="file" accept=".csv,.xlsx,.pdf" className="sr-only" onChange={(e) => void pick(e.target.files?.[0])} />
        </label>
        <p className="mt-3 text-xs text-muted">CSV, Excel (.xlsx) or text-based PDF · up to 5 MB · columns: roll no, name, department, year</p>
      </div>

      {stage === 'checking' && <p role="status" className="flex items-center gap-2 text-sm"><span className="h-4 w-4 animate-spin rounded-full border-2 border-blue-500/30 border-t-blue-400" /> Checking {file?.name}…</p>}
      {(stage === 'error') && <p role="alert" className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-500">{msg}</p>}
      {stage === 'done' && <p role="status" className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-400">✓ {msg}</p>}

      {pv && (stage === 'preview' || stage === 'importing') && (
        <div className="card-static space-y-4">
          <div className="grid grid-cols-2 gap-3 text-center sm:grid-cols-4">
            <Num label="Rows read" v={pv.total} />
            <Num label="New" v={pv.toCreate} tone="ok" />
            <Num label="Updates" v={pv.toUpdate} />
            <Num label="Problems" v={pv.errorCount} tone={pv.errorCount ? 'bad' : undefined} />
          </div>

          {pv.errors.length > 0 && (
            <details className="rounded-xl border border-rose-500/30 bg-rose-500/5 p-3 text-sm" open>
              <summary className="cursor-pointer font-medium text-rose-500">{pv.errorCount} rows will be skipped</summary>
              <ul className="mt-2 max-h-40 space-y-1 overflow-auto text-muted">
                {pv.errors.map((er, i) => <li key={i}>Row {er.row}: {er.message}</li>)}
              </ul>
            </details>
          )}

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <caption className="sr-only">First rows that will be imported</caption>
              <thead className="font-mono text-[11px] uppercase tracking-wider text-muted"><tr><th className="py-2 pr-4">Roll no</th><th className="pr-4">Name</th><th className="pr-4">Dept</th><th>Year</th></tr></thead>
              <tbody>{pv.sample.map((s) => <tr key={s.roll_no} className="border-t border-line"><td className="py-2 pr-4"><span className="badge-mono">{s.roll_no}</span></td><td className="pr-4">{s.full_name}</td><td className="pr-4">{s.department ?? '—'}</td><td>{s.year ?? '—'}</td></tr>)}</tbody>
            </table>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <button className="btn-primary" disabled={!pv.valid || stage === 'importing'} onClick={commit}>
              {stage === 'importing' ? 'Importing…' : `Import ${pv.valid} students`}
            </button>
            <button className="btn-ghost" onClick={reset} disabled={stage === 'importing'}>Cancel</button>
          </div>
        </div>
      )}
      {(stage === 'done' || stage === 'error') && <button className="btn-ghost" onClick={reset}>Upload another file</button>}
    </div>
  );
}

function Num({ label, v, tone }: { label: string; v: number; tone?: 'ok' | 'bad' }) {
  return (
    <div className="rounded-xl border border-line bg-bg/60 p-3">
      <p className={`text-2xl font-bold tabular-nums ${tone === 'bad' ? 'text-rose-500' : tone === 'ok' ? 'text-emerald-500' : ''}`}>{v}</p>
      <p className="text-xs text-muted">{label}</p>
    </div>
  );
}
