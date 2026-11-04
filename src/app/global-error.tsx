'use client';

export default function GlobalError({ reset }: { error: Error; reset: () => void }) {
  return (
    <html lang="en"><body style={{ background: '#0B0F19', color: '#F1F5F9', fontFamily: 'system-ui', display: 'grid', placeItems: 'center', minHeight: '100vh', margin: 0, textAlign: 'center' }}>
      <div><h1>ScanIn hit a critical error</h1><p>Please reload the page.</p>
        <button onClick={reset} style={{ minHeight: 44, padding: '0 20px', borderRadius: 12, border: 0, background: '#CCFF00', fontWeight: 700 }}>Reload</button></div>
    </body></html>
  );
}
