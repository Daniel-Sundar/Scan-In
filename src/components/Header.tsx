'use client';

import { AnimatePresence, motion } from 'framer-motion';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { SignOutButton } from './SignOutButton';
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
  : [{ href: '/login', label: 'Sign in' }, { href: '/contact', label: 'Contact' }];

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
    <header className={`sticky top-0 z-50 border-b border-slate-200 bg-white/70 text-fg backdrop-blur-md transition-shadow dark:border-white/10 dark:bg-slate-950/70 ${scrolled ? 'shadow-lg shadow-black/10 dark:shadow-black/40' : ''}`}>
      <div className={`mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 transition-all sm:px-6 lg:px-8 ${scrolled ? 'h-14' : 'h-[72px]'}`}>
        <Link href={user ? '/dashboard' : '/'} aria-label="ScanIn home" className="rounded-lg text-fg no-underline hover:no-underline"><Logo /></Link>

        <nav aria-label="Primary" className="hidden items-center gap-1 md:flex">
          {links.map((l) => (
            <Link key={l.href} href={l.href} aria-current={path === l.href ? 'page' : undefined}
              className={`relative flex min-h-[44px] items-center rounded-lg px-3.5 text-sm font-medium no-underline transition-colors hover:no-underline ${path.startsWith(l.href) ? 'text-blue-700 dark:text-blue-400' : 'text-muted hover:text-fg'}`}>
              {path.startsWith(l.href) && (
                <motion.span layoutId="nav-pill" aria-hidden transition={{ type: 'spring', stiffness: 380, damping: 32 }}
                  className="absolute inset-0 rounded-lg border border-blue-500/30 bg-blue-600/10 shadow-[0_0_18px_rgba(37,99,235,0.18)]" />
              )}
              <span className="relative">{l.label}</span>
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <ThemeToggle />
          {user && (
            <SignOutButton className="btn-ghost hidden min-h-[40px] px-4 py-2 md:inline-flex" />
          )}
          <button className="grid h-11 w-11 place-items-center rounded-xl border border-slate-300 dark:border-white/10 md:hidden" aria-label="Open menu"
            aria-expanded={open} aria-controls="mobile-menu" onClick={() => setOpen(true)}>
            <svg aria-hidden width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M4 7h16M4 12h16M4 17h16" /></svg>
          </button>
        </div>
      </div>

      <AnimatePresence>
        {open && (
          <>
            <motion.div className="fixed inset-0 z-40 bg-slate-950/60 backdrop-blur-sm md:hidden" onClick={() => setOpen(false)}
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />
            <motion.aside id="mobile-menu" role="dialog" aria-modal="true" aria-label="Menu"
              className="fixed inset-y-0 right-0 z-50 flex w-72 max-w-[85vw] flex-col gap-1 border-l border-line bg-white/95 p-4 backdrop-blur-xl dark:bg-slate-950/95 md:hidden"
              initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'tween', duration: 0.22 }}>
              <button className="mb-2 ml-auto grid h-11 w-11 place-items-center rounded-xl border border-slate-300 dark:border-white/10" aria-label="Close menu" onClick={() => setOpen(false)} autoFocus>✕</button>
              {user && <p className="mb-2 px-3 text-sm text-muted">Signed in as <strong className="text-fg">{user.fullName}</strong> ({user.role})</p>}
              {links.map((l) => (
                <Link key={l.href} href={l.href} className={`flex min-h-[48px] items-center rounded-xl px-3 font-medium no-underline hover:no-underline ${path.startsWith(l.href) ? 'border border-blue-500/30 bg-blue-600/10 text-blue-700 dark:text-blue-400' : 'text-fg hover:bg-blue-500/5'}`}>{l.label}</Link>
              ))}
              {user && (
                <div className="mt-auto"><SignOutButton className="btn-ghost w-full" /></div>
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
    <nav aria-label="Breadcrumb" className="no-print mx-auto w-full max-w-7xl px-4 pt-4 text-sm text-muted sm:px-6 lg:px-8">
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
