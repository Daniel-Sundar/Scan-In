import { ConsentManager } from '@/components/Floating';

export const metadata = { title: 'Cookie Policy' };
export default function Cookies() {
  return (
    <div className="page">
      <h1 className="h1">Cookie Policy</h1>
      <p className="mt-2 text-sm text-muted">Last updated: 4 November 2026</p>
      <div className="prose-legal mt-6">
        <h2>What we use</h2>
        <div className="overflow-x-auto"><table className="w-full text-left text-sm">
          <thead><tr><th>Name</th><th>Purpose</th><th>Type</th><th>Duration</th></tr></thead>
          <tbody>
            <tr><td>sb-*</td><td>Keeps you signed in (authentication session)</td><td>Essential</td><td>Session / refresh</td></tr>
            <tr><td>scanin-theme (local storage)</td><td>Remembers light/dark mode</td><td>Essential preference</td><td>Until cleared</td></tr>
            <tr><td>scanin-consent (local storage)</td><td>Remembers your choice on this page</td><td>Essential</td><td>Until cleared</td></tr>
            <tr><td>scanin-utm (local storage)</td><td>Stores campaign tags (utm_*) from the link you arrived by. Stays on your device; never sent anywhere.</td><td>Optional</td><td>Until cleared</td></tr>
            <tr><td>IndexedDB “scanin”</td><td>Holds scans taken offline until they sync</td><td>Essential</td><td>Until synced</td></tr>
          </tbody></table></div>
        <h2>We do not use</h2><p>Advertising cookies, third-party analytics, social-media pixels or fingerprinting.</p>
        <h2>Manage your choice</h2>
      </div>
      <div className="mt-3 max-w-3xl"><ConsentManager /></div>
    </div>
  );
}
