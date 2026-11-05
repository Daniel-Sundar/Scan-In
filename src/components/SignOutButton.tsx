'use client';

import { animate, useReducedMotion } from 'framer-motion';
import { useState } from 'react';
import { logout } from '@/lib/actions/auth';

const RECT = 'polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)';
const FOLDING = 'polygon(0% 12%, 100% 44%, 100% 56%, 0% 88%)';
const PLANE = 'polygon(0% 30%, 100% 50%, 0% 70%, 22% 50%)';

/** Paper-plane exit: the visible page is copied onto a sheet that folds into a
 *  paper plane and flies off while the sign-out request runs underneath. */
function foldAndFly(): Promise<void> {
  const main = document.getElementById('main');
  const header = document.querySelector('header');
  if (!main || !header) return Promise.resolve();

  const mainRect = main.getBoundingClientRect();
  const top = Math.max(header.getBoundingClientRect().bottom, mainRect.top);

  const wrap = document.createElement('div'); // flies (transform + shadow)
  wrap.setAttribute('aria-hidden', 'true');
  Object.assign(wrap.style, { position: 'fixed', left: '0', right: '0', bottom: '0', top: `${top}px`, zIndex: '80', pointerEvents: 'auto', filter: 'drop-shadow(0 18px 30px rgba(2,6,23,.45))', willChange: 'transform' });

  const sheet = document.createElement('div'); // folds (clip-path)
  Object.assign(sheet.style, { position: 'absolute', inset: '0', overflow: 'hidden', backgroundColor: 'rgb(var(--bg))', backgroundImage: 'var(--glow)', clipPath: RECT, willChange: 'clip-path' });

  const copy = main.cloneNode(true) as HTMLElement;
  copy.removeAttribute('id');
  copy.querySelectorAll('[id]').forEach((n) => n.removeAttribute('id'));
  copy.querySelectorAll('[data-floating]').forEach((n) => n.remove());
  copy.querySelectorAll('[data-page]').forEach((n) => { (n as HTMLElement).style.transform = 'none'; });
  Object.assign(copy.style, { position: 'absolute', left: '0', right: '0', top: `${mainRect.top - top}px`, height: `${mainRect.height}px` });

  const crease = document.createElement('div'); // centre fold line
  Object.assign(crease.style, { position: 'absolute', left: '0', right: '0', top: '50%', height: '2px', opacity: '0', background: 'linear-gradient(90deg, transparent, rgba(148,163,184,.9), transparent)' });

  sheet.append(copy, crease);
  wrap.append(sheet);
  document.body.append(wrap);

  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const total = 1.9;
  const done = () => wrap.remove();

  // 1) fold: corners tuck in to a dart shape and the sheet shrinks
  const fold = animate(sheet, { clipPath: [RECT, RECT, FOLDING, PLANE, PLANE] }, { duration: total, times: [0, 0.1, 0.32, 0.5, 1], ease: 'easeInOut' });
  animate(crease, { opacity: [0, 0, 1, 1, 0] }, { duration: total, times: [0, 0.1, 0.3, 0.5, 0.52] });
  // 2) shrink, tilt, then take off to the upper right
  const fly = animate(
    wrap,
    {
      x: [0, 0, 0, 0, vw * 0.62],
      y: [0, 0, 0, 0, -vh * 0.78],
      scale: [1, 0.9, 0.62, 0.42, 0.12],
      rotate: [0, 0, -4, -8, -28],
      rotateX: [0, 8, 18, 12, 0],
      opacity: [1, 1, 1, 1, 0],
    },
    { duration: total, times: [0, 0.1, 0.32, 0.5, 1], ease: ['easeInOut', 'easeInOut', 'easeInOut', 'easeIn'] },
  );
  return Promise.allSettled([fold, fly]).then(done);
}

export function SignOutButton({ className = 'btn-ghost', children = 'Sign out' }: { className?: string; children?: React.ReactNode }) {
  const [busy, setBusy] = useState(false);
  const reduce = useReducedMotion();

  const onClick = async () => {
    if (busy) return;
    setBusy(true);
    try {
      if (!reduce) {
        const flight = foldAndFly();
        void logout(); // runs under the sheet; redirects to /login
        await flight;
        return;
      }
      await logout();
    } catch {
      await logout();
    } finally {
      setBusy(false);
    }
  };

  return <button type="button" className={className} onClick={onClick} disabled={busy}>{children}</button>;
}
