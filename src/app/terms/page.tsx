export const metadata = { title: 'Terms of Service' };
export default function Terms() {
  return (
    <div className="page">
      <h1 className="h1">Terms of Service</h1>
      <p className="mt-2 text-sm text-muted">Last updated: 4 November 2026 · Template: have legal counsel review before launch.</p>
      <div className="prose-legal mt-6">
        <h2>1. Acceptance</h2><p>By using ScanIn you agree to these terms. If you do not agree, do not use the service.</p>
        <h2>2. Who may use it</h2><p>Accounts are issued to administrators and to invigilators approved by an administrator. You must keep your credentials confidential and are responsible for activity under your account.</p>
        <h2>3. Acceptable use</h2>
        <ul><li>Scan only students on the roster for your allocated hall and time window.</li><li>Do not attempt to access other halls, bypass time limits, or probe the system for weaknesses.</li><li>Do not record or share student data outside your invigilation duties.</li></ul>
        <h2>4. Time-limited access</h2><p>Access for invigilators ends automatically at the end of the allocated window. Records cannot be edited after the window closes.</p>
        <h2>5. Availability</h2><p>We aim for high availability but do not guarantee uninterrupted service. Offline scans are queued on your device and synced on reconnect; keep the page open until they sync.</p>
        <h2>6. Suspension</h2><p>Administrators may suspend accounts that breach these terms.</p>
        <h2>7. Liability</h2><p>To the extent permitted by law, the institution is not liable for indirect loss arising from use of the service. Nothing limits liability that cannot be limited by law.</p>
        <h2>8. Changes and governing law</h2><p>We may update these terms and will show the date above. Governed by the laws of <strong>[jurisdiction]</strong>.</p>
      </div>
    </div>
  );
}
