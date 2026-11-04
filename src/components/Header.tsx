'use client';

import { AnimatePresence, motion } from 'framer-motion';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { logout } from '@/lib/actions/auth';
import { ThemeToggle } from './ui/Chrome';
import { Logo } from './ui/static';

interface U { fullName: string; role: 'admin' | 'teacher' }

const linksFor = (u: U | null) => u
  ? [
      { href: '/dashboard', label: 'Dashboard' },
      ...(u.role === 'admin'
        ? [{ href: '/admin/students', label: 'Students' }, { href: '/admin/teachers', label: 'Teachers' }, { href: '/admin/allocations', label: 'Allocations' }]
        : [{ href: '/scan', label: 'Scan' }]),
      { href: '/contact', label: 'Contact' },
    ]
  : [{ href: '/contact', label: 'Contact' }, { href: '/login', label: 'Sign in' }];

export function Header({ user }: { user: U | null }) {
  const path = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const links = linksFor(user);

  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 4);
    on();
    window.addEventListener('scroll', on, { passive: true });
    return () => window.removeEventListener('scroll', on);
  }, []);
  useEffect(() => setOpen(false), [path]);
  useEffect(() => {
    if (!open) return;
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('keydown', esc);
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', esc); document.body.style.overflow = ''; };
  }, [open]);

  return (
    <header className={`sticky top-0 z-50 border-b border-line bg-midnight text-white transition-shadow ${scrolled ? 'shadow-lg shadow-black/30' : ''}`}>
      <div className={`mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 transition-all sm:px-6 ${scrolled ? 'h-14' : 'h-[72px]'}`}>
        <Link href={user ? '/dashboard' : '/'} aria-label="ScanIn home" className="rounded-lg text-white no-underline hover:no-underline"><Logo /></Link>

        <nav aria-label="Primary" className="hidden items-center gap-1 md:flex">
          {links.map((l) => (
            <Link key={l.href} href={l.href} aria-current={path === l.href ? 'page' : undefined}
              className={`flex min-h-[44px] items-center rounded-lg px-3 text-sm font-medium no-underline hover:no-underline ${path.startsWith(l.href) ? 'bg-cobalt text-white' : 'text-slate-200 hover:bg-white/10'}`}>
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <ThemeToggle />
          {user && (
            <form action={logout} className="hidden md:block">
              <button className="btn-ghost border-white/20 text-white">Sign out</button>
            </form>
          )}
          <button className="grid h-11 w-11 place-items-center rounded-xl border border-white/20 md:hidden" aria-label="Open menu"
            aria-expanded={open} aria-controls="mobile-menu" onClick={() => setOpen(true)}>
            <svg aria-hidden width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M4 7h16M4 12h16M4 17h16" /></svg>
          </button>
        </div>
      </div>

      <AnimatePresence>
        {open && (
          <>
            <motion.div className="fixed inset-0 z-40 bg-black/60 md:hidden" onClick={() => setOpen(false)}
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />
            <motion.aside id="mobile-menu" role="dialog" aria-modal="true" aria-label="Menu"
              className="fixed inset-y-0 right-0 z-50 flex w-72 max-w-[85vw] flex-col gap-1 bg-ink p-4 md:hidden"
              initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'tween', duration: 0.22 }}>
              <button className="mb-2 ml-auto grid h-11 w-11 place-items-center rounded-xl border border-white/20" aria-label="Close menu" onClick={() => setOpen(false)} autoFocus>✕</button>
              {user && <p className="mb-2 px-3 text-sm text-slate-300">Signed in as <strong className="text-white">{user.fullName}</strong> ({user.role})</p>}
              {links.map((l) => (
                <Link key={l.href} href={l.href} className={`flex min-h-[48px] items-center rounded-xl px-3 font-medium no-underline hover:no-underline ${path.startsWith(l.href) ? 'bg-cobalt text-white' : 'text-slate-100 hover:bg-white/10'}`}>{l.label}</Link>
              ))}
              {user && (
                <form action={logout} className="mt-auto"><button className="btn-ghost w-full border-white/20 text-white">Sign out</button></form>
              )}
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </header>
  );
}

const LABELS: Record<string, string> = {
  dashboard: 'Dashboard', admin: 'Admin', students: 'Students', teachers: 'Teachers', allocations: 'Allocations',
  scan: 'Scan', contact: 'Contact', privacy: 'Privacy', terms: 'Terms', cookies: 'Cookies', 'data-deletion': 'Data deletion', login: 'Sign in', register: 'Register',
};

export function Breadcrumbs() {
  const path = usePathname();
  const parts = path.split('/').filter(Boolean);
  if (!parts.length) return null;
  return (
    <nav aria-label="Breadcrumb" className="no-print mx-auto w-full max-w-6xl px-4 pt-4 text-sm text-muted sm:px-6">
      <ol className="flex flex-wrap items-center gap-1.5">
        <li><Link href="/">Home</Link></li>
        {parts.map((p, i) => {
          const href = '/' + parts.slice(0, i + 1).join('/');
          const last = i === parts.length - 1;
          return (
            <li key={href} className="flex items-center gap-1.5">
              <span aria-hidden>/</span>
              {last || p === 'admin' ? <span aria-current={last ? 'page' : undefined} className={last ? 'font-medium text-fg' : ''}>{LABELS[p] ?? p}</span> : <Link href={href}>{LABELS[p] ?? p}</Link>}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
