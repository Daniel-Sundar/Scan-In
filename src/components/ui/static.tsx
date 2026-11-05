import Link from 'next/link';

export function Logo({ className = '' }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 font-extrabold tracking-tight ${className}`}>
      <svg aria-hidden width="28" height="28" viewBox="0 0 32 32" fill="none">
        <rect width="32" height="32" rx="8" fill="#2563EB" /><rect width="32" height="32" rx="8" fill="url(#lg)" opacity=".35" /><defs><linearGradient id="lg" x1="0" y1="0" x2="32" y2="32"><stop stopColor="#fff" /><stop offset="1" stopColor="#fff" stopOpacity="0" /></linearGradient></defs>
        <path d="M8 11V8h3M24 11V8h-3M8 21v3h3M24 21v3h-3" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
        <rect x="8" y="15" width="16" height="2.2" rx="1" fill="#fff" />
      </svg>
      <span>Scan<span className="text-blue-500">In</span></span>
    </span>
  );
}

export function Skeleton({ className = '' }: { className?: string }) {
  return <div aria-hidden className={`animate-pulse rounded-lg bg-line/60 ${className}`} />;
}

export function SkeletonRows({ rows = 5 }: { rows?: number }) {
  return (
    <div role="status" aria-label="Loading" className="space-y-3">
      {Array.from({ length: rows }, (_, i) => <Skeleton key={i} className="h-12 w-full" />)}
      <span className="sr-only">Loading…</span>
    </div>
  );
}

/** Empty / no-results / error panel with a recovery action. */
export function EmptyState({ title, body, action, tone = 'neutral' }: {
  title: string; body?: string; tone?: 'neutral' | 'error';
  action?: { href: string; label: string };
}) {
  return (
    <div className="card-static flex flex-col items-center gap-3 py-12 text-center">
      <svg aria-hidden width="56" height="56" viewBox="0 0 56 56" fill="none">
        <rect x="6" y="14" width="44" height="30" rx="6" stroke={tone === 'error' ? '#EF4444' : '#2563EB'} strokeWidth="2.5" />
        <path d="M14 24h12M14 31h20" stroke="#93C5FD" strokeWidth="2.5" strokeLinecap="round" />
      </svg>
      <h2 className="text-lg font-semibold">{title}</h2>
      {body && <p className="max-w-sm text-sm text-muted">{body}</p>}
      {action && <Link href={action.href} className="btn-primary mt-2">{action.label}</Link>}
    </div>
  );
}

/** Page title block: mono eyebrow, title, optional description and right-aligned actions. */
export function PageHeader({ eyebrow, title, description, children }: { eyebrow: string; title: string; description?: string; children?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h1 className="h1">{title}</h1>
        {description && <p className="mt-2 max-w-2xl text-muted">{description}</p>}
      </div>
      {children}
    </div>
  );
}

/** Pulsing LED "Live" badge. */
export function LiveBadge({ children = 'Live' }: { children?: React.ReactNode }) {
  return (
    <span className="badge-live">
      <span className="relative flex h-2 w-2"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-lime-400 opacity-75" /><span className="relative inline-flex h-2 w-2 animate-pulse rounded-full bg-lime-400" /></span>
      {children}
    </span>
  );
}

export function StatCard({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <div className="card-static">
      <p className="font-mono text-[11px] uppercase tracking-wider text-muted">{label}</p>
      <p className="mt-2 font-mono text-3xl font-extrabold tabular-nums text-slate-950 dark:text-white">{value}</p>
      {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
    </div>
  );
}
