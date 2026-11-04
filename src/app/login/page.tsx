import { LoginForm } from '@/components/AuthForms';

export const metadata = { title: 'Sign in' };
const NOTICE: Record<string, string> = {
  session_expired: 'Your session expired. Please sign in again.',
  login_required: 'Please sign in to continue.',
  verify_failed: 'That verification link is invalid or has expired. Try signing in, or register again.',
};

export default async function Login({ searchParams }: { searchParams: Promise<{ reason?: string; next?: string }> }) {
  const { reason, next } = await searchParams;
  const notice = reason ? NOTICE[reason] : null;
  return (
    <div className="page max-w-md">
      <h1 className="h1">Sign in</h1>
      <p className="mt-2 text-muted">Administrators and invigilators sign in here.</p>
      {notice && <p role="status" className="mt-4 rounded-xl border border-cobalt bg-cobalt/10 px-4 py-3 text-sm">{notice}</p>}
      <div className="card-static mt-6"><LoginForm next={next} /></div>
    </div>
  );
}
