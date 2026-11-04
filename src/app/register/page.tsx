import { RegisterForm } from '@/components/AuthForms';

export const metadata = { title: 'Teacher registration' };
export default function Register() {
  return (
    <div className="page max-w-md">
      <h1 className="h1">Invigilator registration</h1>
      <p className="mt-2 text-muted">Only emails approved by an administrator can register. You’ll get a verification email.</p>
      <div className="card-static mt-6"><RegisterForm /></div>
    </div>
  );
}
