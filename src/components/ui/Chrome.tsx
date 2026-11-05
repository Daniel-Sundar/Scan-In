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
      <div className="h-full bg-blue-500 transition-[width] duration-100" style={{ width: `${p}%` }} />
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
      className="fixed bottom-24 right-6 z-40 grid h-12 w-12 place-items-center rounded-full border border-blue-400/30 bg-blue-600 text-white shadow-lg shadow-blue-600/30 transition hover:bg-blue-500 active:scale-95">
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
  const ease = 'transition-all duration-700 ease-[cubic-bezier(0.68,-0.3,0.27,1.3)]';
  const icon = `absolute inset-0 m-auto h-3.5 w-3.5 ${ease}`;
  const svg = { width: 14, height: 14, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2.2, strokeLinecap: 'round', strokeLinejoin: 'round' } as const;
  return (
    <button onClick={flip} role="switch" aria-checked={dark} aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
      className={`relative h-8 w-[60px] shrink-0 rounded-full border transition-all duration-500 ${dark ? 'border-blue-500/40 bg-slate-900 shadow-[0_0_18px_rgba(37,99,235,0.35)]' : 'border-amber-300 bg-amber-100 shadow-[0_0_18px_rgba(251,191,36,0.45)]'}`}>
      <span aria-hidden className={`absolute top-0.5 h-6 w-6 rounded-full ${ease} ${dark ? 'left-[calc(100%-1.625rem)] bg-blue-600 text-white' : 'left-0.5 bg-white text-amber-500 shadow'}`}>
        {/* The whole icon makes a full turn: forward into dark, backward into light. */}
        <span className={`absolute inset-0 block ${ease} ${dark ? 'rotate-[360deg]' : 'rotate-0'}`}>
          <svg {...svg} className={`${icon} ${dark ? 'scale-0 rotate-[120deg] opacity-0' : 'scale-100 rotate-0 opacity-100'}`}><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></svg>
          <svg {...svg} className={`${icon} ${dark ? 'scale-100 rotate-0 opacity-100' : 'scale-0 -rotate-[120deg] opacity-0'}`}><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" /></svg>
        </span>
      </span>
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
        className={`pointer-events-none absolute -top-9 left-1/2 -translate-x-1/2 rounded-md bg-[#CCFF00] px-2 py-1 text-xs font-semibold text-slate-950 transition ${done ? 'opacity-100' : 'opacity-0'}`}>
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
