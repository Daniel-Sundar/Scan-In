'use client';

import { useEffect, useState } from 'react';

export function ScrollProgress() {
  const [p, setP] = useState(0);
  useEffect(() => {
    const on = () => {
      const h = document.documentElement;
      const max = h.scrollHeight - h.clientHeight;
      setP(max > 0 ? (h.scrollTop / max) * 100 : 0);
    };
    on();
    window.addEventListener('scroll', on, { passive: true });
    return () => window.removeEventListener('scroll', on);
  }, []);
  return (
    <div aria-hidden data-floating className="fixed inset-x-0 top-0 z-[60] h-1 bg-transparent">
      <div className="h-full bg-lime transition-[width] duration-100" style={{ width: `${p}%` }} />
    </div>
  );
}

export function BackToTop() {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const on = () => setShow(window.scrollY > window.innerHeight);
    window.addEventListener('scroll', on, { passive: true });
    return () => window.removeEventListener('scroll', on);
  }, []);
  if (!show) return null;
  return (
    <button data-floating aria-label="Back to top" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      className="fixed bottom-24 right-4 z-40 grid h-12 w-12 place-items-center rounded-full bg-cobalt text-white shadow-lg transition hover:bg-cobalt-deep active:scale-95 sm:bottom-6 sm:right-24">
      <svg aria-hidden width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M12 19V5M5 12l7-7 7 7" /></svg>
    </button>
  );
}

export function ThemeToggle() {
  const [dark, setDark] = useState(true);
  useEffect(() => setDark(document.documentElement.classList.contains('dark')), []);
  const flip = () => {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle('dark', next);
    try { localStorage.setItem('scanin-theme', next ? 'dark' : 'light'); } catch { /* storage blocked */ }
  };
  return (
    <button onClick={flip} aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'} aria-pressed={dark}
      className="grid h-11 w-11 place-items-center rounded-xl border border-line transition hover:border-cobalt hover:bg-cobalt/10">
      <svg aria-hidden width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        {dark ? <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
          : <><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></>}
      </svg>
    </button>
  );
}

export function CopyButton({ text, label = 'Copy' }: { text: string; label?: string }) {
  const [done, setDone] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setDone(true);
      setTimeout(() => setDone(false), 1800);
    } catch { /* clipboard blocked */ }
  };
  return (
    <span className="relative inline-flex">
      <button onClick={copy} aria-label={`${label}: ${text}`} className="btn-ghost min-h-[44px] px-3 text-xs">{done ? 'Copied ✓' : label}</button>
      <span role="status" aria-live="polite"
        className={`pointer-events-none absolute -top-9 left-1/2 -translate-x-1/2 rounded-md bg-lime px-2 py-1 text-xs font-semibold text-midnight transition ${done ? 'opacity-100' : 'opacity-0'}`}>
        {done ? 'Copied to clipboard' : ''}
      </span>
    </span>
  );
}

/** "Last updated 12 s ago" that ticks. */
export function LastUpdated({ at }: { at: string | number | Date | null }) {
  const [, tick] = useState(0);
  useEffect(() => { const t = setInterval(() => tick((n) => n + 1), 5000); return () => clearInterval(t); }, []);
  if (!at) return <span className="text-xs text-muted">Not yet updated</span>;
  const s = Math.max(0, Math.round((Date.now() - new Date(at).getTime()) / 1000));
  return <time dateTime={new Date(at).toISOString()} className="text-xs text-muted">Last updated {s < 5 ? 'just now' : s < 60 ? `${s}s ago` : `${Math.floor(s / 60)}m ago`}</time>;
}
