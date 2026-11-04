import Link from 'next/link';
import { Faq } from '@/components/Faq';
import { getSessionUser } from '@/lib/auth/guards';

const FEATURES = [
  { t: 'Scan in seconds', d: 'Point a phone at the ID barcode. Check-in is recorded instantly, even on a weak exam-hall network.' },
  { t: 'Locked to the exam window', d: 'Invigilators see only their own hall, and access ends the second the exam window closes.' },
  { t: 'Private by design', d: 'Only roll number, name, department and year are stored. No tracking scripts.' },
];
const FAQ = [
  { q: 'What if the Wi-Fi drops mid-exam?', a: 'Scans are saved on the device and synced automatically when the connection returns. Each scan has a unique ID so nothing is counted twice.' },
  { q: 'Can a teacher see other halls?', a: 'No. Every query is restricted at the database level to the halls allocated to that teacher, during their exam window only.' },
  { q: 'Who can create teacher accounts?', a: 'Only administrators. A teacher can register only with an email an administrator has approved.' },
  { q: 'What data do you keep?', a: 'Roll number, name, department, year and attendance timestamps. You can request deletion any time from the Data deletion page.' },
];

export default async function Home() {
  const user = await getSessionUser();
  return (
    <div>
      <section className="bg-midnight text-white">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-16 sm:px-6 sm:py-24 lg:grid-cols-2 lg:items-center">
          <div>
            <p className="mb-3 inline-block rounded-full border border-cobalt px-3 py-1 text-xs font-semibold text-cobalt-light">Exam hall attendance</p>
            <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl">Take attendance with a <span className="text-lime">single scan.</span></h1>
            <p className="mt-4 max-w-lg text-lg text-slate-300">ScanIn gives invigilators a fast, secure barcode scanner and gives administrators a live view of every hall.</p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link href={user ? '/dashboard' : '/login'} className="btn-cta">{user ? 'Open dashboard' : 'Sign in'}</Link>
              <Link href="/contact" className="btn-ghost border-white/30 text-white">Contact us</Link>
            </div>
          </div>
          <svg role="img" aria-label="Illustration of a phone scanning a student ID barcode" viewBox="0 0 400 300" className="mx-auto w-full max-w-md">
            <rect x="120" y="20" width="160" height="260" rx="24" fill="#111827" stroke="#2563EB" strokeWidth="4" />
            <rect x="140" y="60" width="120" height="70" rx="8" fill="#0B0F19" stroke="#CCFF00" strokeWidth="3" />
            <path d="M152 78v34M160 78v34M170 78v34M176 78v34M188 78v34M196 78v34M208 78v34M216 78v34M228 78v34M240 78v34" stroke="#F1F5F9" strokeWidth="3" />
            <line x1="140" y1="95" x2="260" y2="95" stroke="#CCFF00" strokeWidth="2" />
            <rect x="140" y="160" width="120" height="14" rx="7" fill="#2563EB" /><rect x="140" y="185" width="80" height="10" rx="5" fill="#1F2A44" />
            <circle cx="200" cy="240" r="16" fill="#CCFF00" />
          </svg>
        </div>
      </section>
      <section className="page">
        <h2 className="text-2xl font-bold sm:text-3xl">Built for busy exam halls</h2>
        <div className="mt-6 grid gap-4 md:grid-cols-3">{FEATURES.map((f) => <div key={f.t} className="card"><h3 className="font-semibold">{f.t}</h3><p className="mt-2 text-sm text-muted">{f.d}</p></div>)}</div>
      </section>
      <section className="page pt-0">
        <h2 className="mb-6 text-2xl font-bold sm:text-3xl">Frequently asked questions</h2>
        <Faq items={FAQ} />
      </section>
    </div>
  );
}
