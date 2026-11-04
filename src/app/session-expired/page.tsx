import Link from 'next/link';

export const metadata = { title: 'Session expired' };
export default function SessionExpired() {
  return (
    <div className="page grid place-items-center text-center">
      <h1 className="h1">Your session has expired</h1>
      <p className="mt-3 max-w-md text-muted">For your security we signed you out. Sign in again to pick up where you left off.</p>
      <Link href="/login" className="btn-cta mt-6">Sign in</Link>
    </div>
  );
}
