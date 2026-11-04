'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

interface Conn extends EventTarget { effectiveType?: string; saveData?: boolean }
const getConn = () => (navigator as Navigator & { connection?: Conn }).connection;

/** Offline banner + slow-network toast. */
export function NetworkStatus() {
  const [online, setOnline] = useState(true);
  const [slow, setSlow] = useState(false);

  useEffect(() => {
    setOnline(navigator.onLine);
    const up = () => setOnline(true);
    const down = () => setOnline(false);
    window.addEventListener('online', up);
    window.addEventListener('offline', down);
    const c = getConn();
    const check = () => setSlow(!!c && ['slow-2g', '2g'].includes(c.effectiveType ?? ''));
    check();
    c?.addEventListener('change', check);
    return () => { window.removeEventListener('online', up); window.removeEventListener('offline', down); c?.removeEventListener('change', check); };
  }, []);

  useEffect(() => {
    if (!slow) return;
    const t = setTimeout(() => setSlow(false), 8000);
    return () => clearTimeout(t);
  }, [slow]);

  return (
    <>
      {!online && (
        <div role="alert" className="no-print sticky top-0 z-[55] bg-amber-400 px-4 py-2 text-center text-sm font-semibold text-midnight">
          You are offline. Scans are saved on this device and will sync when you reconnect.
        </div>
      )}
      {slow && online && (
        <div role="status" data-floating className="fixed left-1/2 top-20 z-[55] -translate-x-1/2 rounded-xl border border-amber-400 bg-surface px-4 py-3 text-sm shadow-xl">
          ⚠ Slow connection detected. Things may take longer to load.
        </div>
      )}
    </>
  );
}

/** Polls the session; shows a banner when it lapses. */
export function SessionWatcher() {
  const [expired, setExpired] = useState(false);
  useEffect(() => {
    const check = async () => {
      if (!navigator.onLine) return;
      try { const r = await fetch('/api/me', { cache: 'no-store' }); if (r.status === 401) setExpired(true); } catch { /* network blip */ }
    };
    const t = setInterval(check, 60000);
    const vis = () => document.visibilityState === 'visible' && check();
    document.addEventListener('visibilitychange', vis);
    return () => { clearInterval(t); document.removeEventListener('visibilitychange', vis); };
  }, []);
  if (!expired) return null;
  return (
    <div role="alertdialog" aria-label="Session expired" className="fixed inset-x-3 top-3 z-[70] mx-auto max-w-lg rounded-2xl border border-cobalt bg-surface p-4 shadow-2xl">
      <p className="font-semibold">Your session has expired</p>
      <p className="mt-1 text-sm text-muted">For your security you were signed out. Sign in again to continue.</p>
      <Link href="/login?reason=session_expired" className="btn-cta mt-3">Sign in again</Link>
    </div>
  );
}
