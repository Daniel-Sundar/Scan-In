'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ContactForm } from './ContactForm';
import { Modal } from './ui/Modal';

/** Floating contact button -> quick inquiry modal. */
export function ContactFab() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button data-floating onClick={() => setOpen(true)} aria-label="Quick contact" aria-haspopup="dialog"
        className="fixed bottom-6 right-6 z-40 grid h-14 w-14 place-items-center rounded-full border border-blue-400/30 bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-glow transition hover:from-blue-500 hover:to-blue-400 active:scale-95">
        <svg aria-hidden width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title="Quick inquiry">
        <ContactForm compact />
        <p className="mt-3 text-xs text-muted">Prefer the full page? <Link href="/contact">Open contact page</Link></p>
      </Modal>
    </>
  );
}

type Consent = 'essential' | 'all';
const KEY = 'scanin-consent';
const read = (): Consent | null => { try { return localStorage.getItem(KEY) as Consent | null; } catch { return null; } };

/** GDPR banner: equal-weight buttons, nothing optional runs before consent. */
export function CookieBanner() {
  const [shown, setShown] = useState(false);
  useEffect(() => {
    setShown(read() === null);
    const reopen = () => setShown(true);
    window.addEventListener('scanin:open-consent', reopen);
    return () => window.removeEventListener('scanin:open-consent', reopen);
  }, []);
  const choose = (c: Consent) => {
    try { localStorage.setItem(KEY, c); } catch { /* storage blocked: ask again next visit */ }
    window.dispatchEvent(new Event('scanin:consent-changed'));
    setShown(false);
  };
  if (!shown) return null;
  return (
    <div data-floating role="dialog" aria-label="Cookie consent" aria-live="polite"
      className="fixed bottom-3 left-3 right-24 z-50 max-w-2xl rounded-2xl border border-line bg-surface/95 p-4 backdrop-blur-xl shadow-2xl sm:p-5">
      <p className="text-sm">We use only essential cookies to keep you signed in. Optional storage (campaign source tags) is off unless you allow it. See our <Link href="/cookies">Cookie Policy</Link>.</p>
      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <button className="btn-ghost flex-1" onClick={() => choose('essential')}>Essential only</button>
        <button className="btn-ghost flex-1" onClick={() => choose('all')}>Allow optional</button>
      </div>
    </div>
  );
}

export function ConsentManager() {
  const [c, setC] = useState<Consent | null>(null);
  useEffect(() => {
    setC(read());
    const on = () => setC(read());
    window.addEventListener('scanin:consent-changed', on);
    return () => window.removeEventListener('scanin:consent-changed', on);
  }, []);
  return (
    <div className="card-static not-prose">
      <p className="text-sm text-fg">Current setting: <strong>{c === 'all' ? 'Optional storage allowed' : c === 'essential' ? 'Essential only' : 'Not chosen yet'}</strong></p>
      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <button className="btn-ghost" onClick={() => { try { localStorage.setItem(KEY, 'essential'); localStorage.removeItem('scanin-utm'); } catch {} window.dispatchEvent(new Event('scanin:consent-changed')); }}>Essential only</button>
        <button className="btn-ghost" onClick={() => { try { localStorage.setItem(KEY, 'all'); } catch {} window.dispatchEvent(new Event('scanin:consent-changed')); }}>Allow optional</button>
      </div>
    </div>
  );
}

/** First-party campaign tags (utm_*) are stored ONLY after opt-in. Nothing is sent anywhere. */
export function UtmTracker() {
  useEffect(() => {
    const capture = () => {
      if (read() !== 'all') return;
      const q = new URLSearchParams(location.search);
      const utm: Record<string, string> = {};
      ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'].forEach((k) => {
        const v = q.get(k);
        if (v) utm[k] = v.slice(0, 100);
      });
      if (Object.keys(utm).length) { try { localStorage.setItem('scanin-utm', JSON.stringify({ ...utm, at: Date.now() })); } catch {} }
    };
    capture();
    window.addEventListener('scanin:consent-changed', capture);
    return () => window.removeEventListener('scanin:consent-changed', capture);
  }, []);
  return null;
}
