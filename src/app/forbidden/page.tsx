import Link from 'next/link';

export const metadata = { title: 'Access denied' };
const REASONS: Record<string, string> = {
  admin_only: 'This area is for administrators only.',
  teacher_only: 'Scanning is available to invigilator accounts only.',
  no_active_allocation: 'You have no active hall allocation right now. Access opens at your assigned start time and closes automatically at the end.',
  account_disabled: 'This account has been disabled. Contact your administrator.',
  wrong_role: 'Your role does not have access to that page.',
};

export default async function Forbidden({ searchParams }: { searchParams: Promise<{ reason?: string }> }) {
  const { reason } = await searchParams;
  return (
    <div className="page grid place-items-center text-center">
      <p className="text-7xl font-extrabold text-amber-400">403</p>
      <h1 className="h1 mt-2">Permission denied</h1>
      <p className="mt-3 max-w-md text-muted">{REASONS[reason ?? ''] ?? 'You don’t have permission to view this page.'}</p>
      <div className="mt-6 flex flex-col gap-3 sm:flex-row"><Link href="/dashboard" className="btn-cta">Back to dashboard</Link><Link href="/contact" className="btn-ghost">Request access</Link></div>
    </div>
  );
}
