import Link from 'next/link';

export const metadata = { title: 'Privacy Policy' };
export default function Privacy() {
  return (
    <div className="page">
      <h1 className="h1">Privacy Policy</h1>
      <p className="mt-2 text-sm text-muted">Last updated: 4 November 2026 · Template: have your institution’s legal counsel review before launch.</p>
      <div className="prose-legal mt-6">
        <h2>1. Who we are</h2>
        <p>ScanIn is operated by <strong>[Institution name]</strong> (the “Controller”) to record attendance in examination halls. Contact: <Link href="/contact">contact page</Link> or <strong>[privacy contact email]</strong>.</p>
        <h2>2. What we collect (data minimisation)</h2>
        <ul><li><strong>Students:</strong> roll number, full name, department, year, and the time they were checked in to an exam.</li>
          <li><strong>Invigilators and administrators:</strong> name, university email, role, consent timestamp, and audit events of actions taken.</li>
          <li><strong>Contact form:</strong> name, email and message you choose to send.</li></ul>
        <p>We do not collect photos, phone numbers, addresses, precise location or biometrics. The camera is used only on your device to read a barcode; images are never uploaded or stored.</p>
        <h2>3. Why and on what basis</h2>
        <p>Student data is processed to verify exam attendance (public task / legitimate interest of the institution). Staff accounts are processed to provide access (contract / legitimate interest). Contact messages are processed on your consent.</p>
        <h2>4. Who can see it</h2>
        <p>Invigilators see only the students on halls allocated to them, only during the allocated exam window. Administrators can see all records. Access is enforced in the database, not just the interface. We use no advertising or analytics trackers, and share data with no third party except our hosting and database processor (<strong>[Supabase / hosting region]</strong>) under a data-processing agreement.</p>
        <h2>5. Retention</h2>
        <p>Attendance records are kept for <strong>[retention period, e.g. 1 academic year]</strong> and then deleted. Contact messages are kept for up to 12 months.</p>
        <h2>6. Your rights</h2>
        <p>You may request access, correction, deletion, restriction or portability, and may object to processing or withdraw consent at any time. Use the <Link href="/data-deletion">Data deletion page</Link> or contact us. You may also complain to your data-protection authority.</p>
        <h2>7. Security</h2>
        <p>HTTPS everywhere, strict security headers, row-level security on every table, server-side session checks, and audit logging.</p>
        <h2>8. Cookies</h2>
        <p>See the <Link href="/cookies">Cookie Policy</Link>.</p>
      </div>
    </div>
  );
}
