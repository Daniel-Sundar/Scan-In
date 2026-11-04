import type { Metadata, Viewport } from 'next';
import { headers } from 'next/headers';
import Link from 'next/link';
import { Breadcrumbs, Header } from '@/components/Header';
import { ContactFab, CookieBanner, UtmTracker } from '@/components/Floating';
import { NetworkStatus, SessionWatcher } from '@/components/Status';
import { BackToTop, ScrollProgress } from '@/components/ui/Chrome';
import { Logo } from '@/components/ui/static';
import { getSessionUser } from '@/lib/auth/guards';
import './globals.css';

export const metadata: Metadata = {
  title: { default: 'ScanIn · Exam hall attendance', template: '%s · ScanIn' },
  description: 'Barcode attendance scanning for university exam halls.',
  robots: { index: false },
};
export const viewport: Viewport = { width: 'device-width', initialScale: 1, themeColor: '#0B0F19' };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const nonce = (await headers()).get('x-nonce') ?? undefined;
  const user = await getSessionUser();

  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <head>
        {/* Applies saved theme before first paint (no flash). Dark by default. */}
        <script nonce={nonce} suppressHydrationWarning
          dangerouslySetInnerHTML={{ __html: `try{if(localStorage.getItem('scanin-theme')==='light')document.documentElement.classList.remove('dark')}catch(e){}` }} />
      </head>
      <body className="flex min-h-screen flex-col">
        <a href="#main" className="sr-only z-[100] rounded-xl bg-lime px-4 py-3 font-bold text-midnight focus:not-sr-only focus:fixed focus:left-3 focus:top-3">Skip to content</a>
        <ScrollProgress />
        <NetworkStatus />
        <Header user={user ? { fullName: user.fullName, role: user.role } : null} />
        <Breadcrumbs />
        <main id="main" tabIndex={-1} className="flex-1 focus:outline-none">{children}</main>
        <footer className="mt-12 border-t border-line bg-ink text-slate-300">
          <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-8 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <div><Logo className="text-white" /><p className="mt-2 max-w-xs text-xs">Attendance for exam halls. Collects only what is needed to record who sat the exam.</p></div>
            <nav aria-label="Legal" className="flex flex-wrap gap-x-5 gap-y-1 text-sm [&_a]:flex [&_a]:min-h-[44px] [&_a]:items-center [&_a]:text-slate-200">
              <Link href="/privacy">Privacy</Link><Link href="/terms">Terms</Link><Link href="/cookies">Cookies</Link>
              <Link href="/data-deletion">Data deletion</Link><Link href="/contact">Contact</Link>
            </nav>
          </div>
        </footer>
        {user && <SessionWatcher />}
        <BackToTop />
        <ContactFab />
        <CookieBanner />
        <UtmTracker />
      </body>
    </html>
  );
}
