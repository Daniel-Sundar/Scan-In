import Link from 'next/link';
import { requirePage } from '@/lib/auth/guards';

export const metadata = { title: 'Success' };
const MAP: Record<string, { title: string; body: string; next: { href: string; label: string } }> = {
  student: { title: 'Student added', body: 'The student can now be placed on a hall roster.', next: { href: '/admin/students', label: 'Back to students' } },
  teacher: { title: 'Teacher whitelisted', body: 'They can now register with that email. Ask them to check their inbox to verify.', next: { href: '/admin/teachers', label: 'Back to teachers' } },
  allocation: { title: 'Allocation created', body: 'The teacher’s access opens at the start time and closes automatically at the end.', next: { href: '/admin/allocations', label: 'View allocations' } },
};

export default async function Success({ searchParams }: { searchParams: Promise<{ type?: string }> }) {
  await requirePage();
  const m = MAP[(await searchParams).type ?? ''] ?? { title: 'Done', body: 'Your action was completed.', next: { href: '/dashboard', label: 'Dashboard' } };
  return (
    <div className="page grid place-items-center text-center">
      <div role="status" className="grid h-20 w-20 place-items-center rounded-full bg-lime text-4xl text-midnight">✓</div>
      <h1 className="h1 mt-5">{m.title}</h1>
      <p className="mt-3 max-w-md text-muted">{m.body}</p>
      <div className="mt-6 flex flex-col gap-3 sm:flex-row"><Link href={m.next.href} className="btn-primary">{m.next.label}</Link><Link href="/dashboard" className="btn-ghost">Dashboard</Link></div>
    </div>
  );
}
