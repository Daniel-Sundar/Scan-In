import { ContactForm } from '@/components/ContactForm';
import { PageHeader } from '@/components/ui/static';

export const metadata = { title: 'Contact' };
export default function Contact() {
  return (
    <div className="page grid gap-8 lg:grid-cols-2 lg:items-start">
      <div>
        <PageHeader eyebrow="Support" title="Contact us" />
        <p className="mt-3 text-muted">Questions about access, a hall allocation, or your data? Send a message and an administrator will reply to your email.</p>
        <ul className="mt-6 space-y-2 text-sm text-muted"><li>Typical reply: within one working day.</li><li>For urgent exam-day issues, speak to the chief invigilator.</li></ul>
      </div>
      <div className="card-static"><ContactForm /></div>
    </div>
  );
}
