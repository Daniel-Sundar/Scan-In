'use client';

import Link from 'next/link';

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="page grid place-items-center text-center">
      <p className="text-7xl font-extrabold text-red-500">500</p>
      <h1 className="h1 mt-2">Something went wrong</h1>
      <p className="mt-3 max-w-md text-muted">An unexpected error occurred. Your data is safe. Try again, or contact support{error.digest ? ` quoting reference ${error.digest}` : ''}.</p>
      <div className="mt-6 flex flex-col gap-3 sm:flex-row"><button onClick={reset} className="btn-primary">Try again</button><Link href="/" className="btn-ghost">Home</Link></div>
    </div>
  );
}
