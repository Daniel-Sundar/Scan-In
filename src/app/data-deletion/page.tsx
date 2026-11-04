import Link from 'next/link';
import { DeletionForm } from '@/components/DeletionForm';
import { getSessionUser } from '@/lib/auth/guards';

export const metadata = { title: 'Data deletion request' };
export default async function DataDeletion() {
  const user = await getSessionUser();
  return (
    <div className="page max-w-2xl">
      <h1 className="h1">Right to be forgotten</h1>
      <p className="mt-3 text-muted">Ask us to erase your personal data. Staff accounts are anonymised (name and email removed, account disabled). Attendance entries are retained without personal identifiers where exam-integrity rules require it.</p>
      <div className="card-static mt-6">
        {user ? <DeletionForm email={user.email} /> : (
          <div><p className="text-sm">Staff: <Link href="/login">sign in</Link> to submit a request for your account.</p>
            <p className="mt-2 text-sm">Students: use the <Link href="/contact">contact form</Link> with your roll number; an administrator will verify and process your request.</p></div>)}
      </div>
    </div>
  );
}
