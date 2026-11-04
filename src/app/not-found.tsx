import Link from 'next/link';

export const metadata = { title: 'Page not found' };
export default function NotFound() {
  return (
    <div className="page grid place-items-center text-center">
      <p className="text-7xl font-extrabold text-link">404</p>
      <h1 className="h1 mt-2">We can’t find that page</h1>
      <p className="mt-3 max-w-md text-muted">The link may be broken or the page may have moved.</p>
      <div className="mt-6 flex flex-col gap-3 sm:flex-row"><Link href="/dashboard" className="btn-cta">Go to dashboard</Link><Link href="/contact" className="btn-ghost">Contact support</Link></div>
    </div>
  );
}
