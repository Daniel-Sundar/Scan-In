'use client';

import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { useCallback, useEffect, useRef, useState } from 'react';
import { enqueueScan, listQueue, queueSize, removeQueued, type QueuedScan } from '@/lib/offlineQueue';

type Phase = 'idle' | 'starting' | 'scanning' | 'denied' | 'no-camera' | 'expired' | 'error';
type Flash = { kind: 'ok' | 'duplicate' | 'rejected' | 'queued'; text: string } | null;
type ScanResponse = { status?: 'ok' | 'duplicate' | 'not_on_roster'; student?: { full_name: string; roll_no: string }; error?: string };

const READER_ID = 'scanin-reader';
const FORMATS = [
  Html5QrcodeSupportedFormats.CODE_128, Html5QrcodeSupportedFormats.CODE_39,
  Html5QrcodeSupportedFormats.EAN_13, Html5QrcodeSupportedFormats.EAN_8,
  Html5QrcodeSupportedFormats.ITF, Html5QrcodeSupportedFormats.QR_CODE,
];
const REPEAT_LOCK_MS = 2500; // ignore the same code while it is still in front of the lens
const HEARTBEAT_MS = 15000;

/* ---- feedback helpers (no asset files: WebAudio beep) ---- */
let audioCtx: AudioContext | null = null;
function beep(freq: number, ms: number) {
  try {
    audioCtx ??= new AudioContext();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.frequency.value = freq;
    gain.gain.value = 0.15;
    osc.connect(gain).connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + ms / 1000);
  } catch { /* audio blocked: visual feedback still shows */ }
}
const haptic = (p: number | number[]) => { try { navigator.vibrate?.(p); } catch { /* unsupported */ } };

export default function Scanner({ allocationId }: { allocationId: string }) {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const lastRef = useRef<{ code: string; at: number }>({ code: '', at: 0 });
  const endsAtRef = useRef<number | null>(null);

  const [phase, setPhase] = useState<Phase>('idle');
  const [flash, setFlash] = useState<Flash>(null);
  const [torchSupported, setTorchSupported] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  const [online, setOnline] = useState(true);
  const [pending, setPending] = useState(0);
  const [remaining, setRemaining] = useState<number | null>(null);
  const [count, setCount] = useState(0);

  const show = useCallback((f: NonNullable<Flash>) => {
    setFlash(f);
    window.setTimeout(() => setFlash((cur) => (cur === f ? null : cur)), 2200);
  }, []);

  /* ---------- submit one scan (optimistic, offline-safe) ---------- */
  const post = useCallback(async (s: QueuedScan, source: 'camera' | 'offline_sync'): Promise<'done' | 'retry' | 'rejected'> => {
    try {
      const res = await fetch('/api/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...s, source }),
      });
      if (res.status === 401 || res.status === 403) {
        setPhase('expired');
        return 'rejected';
      }
      const data: ScanResponse = await res.json().catch(() => ({}));
      if (res.ok && data.status === 'ok') {
        show({ kind: 'ok', text: `${data.student?.full_name} · checked in` });
        setCount((c) => c + 1);
        return 'done';
      }
      if (data.status === 'duplicate') {
        show({ kind: 'duplicate', text: `${data.student?.full_name ?? s.rollNo} · already checked in` });
        return 'done';
      }
      if (res.status === 404) {
        show({ kind: 'rejected', text: `${s.rollNo} · not on this hall's roster` });
        return 'done';
      }
      return 'retry';
    } catch {
      return 'retry'; // network failure
    }
  }, [show]);

  const syncQueue = useCallback(async () => {
    for (const item of await listQueue()) {
      const r = await post(item, 'offline_sync');
      if (r === 'retry') break;
      await removeQueued(item.clientScanId); // done or rejected: don't loop forever
    }
    setPending(await queueSize());
  }, [post]);

  const handleDecoded = useCallback(async (raw: string) => {
    const code = raw.trim();
    const now = Date.now();
    if (code === lastRef.current.code && now - lastRef.current.at < REPEAT_LOCK_MS) return;
    lastRef.current = { code, at: now };

    beep(1040, 90);
    haptic(60);

    const scan: QueuedScan = {
      clientScanId: crypto.randomUUID(),
      allocationId,
      rollNo: code,
      clientScannedAt: new Date().toISOString(),
    };
    if (!navigator.onLine) {
      await enqueueScan(scan);
      setPending(await queueSize());
      show({ kind: 'queued', text: `${code} · saved offline, will sync` });
      return;
    }
    const r = await post(scan, 'camera');
    if (r === 'retry') {
      await enqueueScan(scan);
      setPending(await queueSize());
      show({ kind: 'queued', text: `${code} · network issue, queued` });
    } else if (r === 'rejected') {
      beep(220, 250); haptic([80, 60, 80]);
    }
  }, [allocationId, post, show]);

  /* ---------- camera lifecycle ---------- */
  const stop = useCallback(async () => {
    const s = scannerRef.current;
    scannerRef.current = null;
    if (!s) return;
    try { if (s.isScanning) await s.stop(); s.clear(); } catch { /* already stopped */ }
    setTorchOn(false);
    setTorchSupported(false);
  }, []);

  const start = useCallback(async () => {
    setPhase('starting');
    try {
      const cams = await Html5Qrcode.getCameras();
      if (!cams.length) { setPhase('no-camera'); return; }

      const scanner = new Html5Qrcode(READER_ID, { formatsToSupport: FORMATS, verbose: false, useBarCodeDetectorIfSupported: true });
      scannerRef.current = scanner;
      await scanner.start(
        { facingMode: 'environment' },
        {
          fps: 12,
          qrbox: (w, h) => ({ width: Math.floor(Math.min(w, h) * 0.85), height: Math.floor(Math.min(w, h) * 0.45) }),
        },
        (text) => { void handleDecoded(text); },
        () => { /* per-frame "no code found": ignore */ },
      );
      try { setTorchSupported(scanner.getRunningTrackCameraCapabilities().torchFeature().isSupported()); } catch { setTorchSupported(false); }
      setPhase('scanning');
    } catch (e) {
      const msg = String((e as Error)?.name ?? '') + String((e as Error)?.message ?? e);
      await stop();
      if (/NotAllowed|Permission|denied/i.test(msg)) setPhase('denied');
      else if (/NotFound|no camera|Requested device/i.test(msg)) setPhase('no-camera');
      else setPhase('error');
    }
  }, [handleDecoded, stop]);

  const toggleTorch = async () => {
    try {
      const t = scannerRef.current?.getRunningTrackCameraCapabilities().torchFeature();
      if (!t?.isSupported()) return;
      await t.apply(!torchOn);
      setTorchOn(!torchOn);
    } catch { setTorchSupported(false); }
  };

  /* ---------- connectivity + queue ---------- */
  useEffect(() => {
    setOnline(navigator.onLine);
    void queueSize().then(setPending).catch(() => undefined);
    const up = () => { setOnline(true); void syncQueue(); };
    const down = () => setOnline(false);
    window.addEventListener('online', up);
    window.addEventListener('offline', down);
    if (navigator.onLine) void syncQueue();
    return () => { window.removeEventListener('online', up); window.removeEventListener('offline', down); };
  }, [syncQueue]);

  /* ---------- server-authoritative window: heartbeat + local countdown ---------- */
  useEffect(() => {
    let alive = true;
    const beat = async () => {
      try {
        const r = await fetch(`/api/scan/session?allocation=${allocationId}`, { cache: 'no-store' });
        if (!alive) return;
        if (r.status === 401 || r.status === 403) { setPhase('expired'); return; }
        if (r.ok) endsAtRef.current = Date.now() + (await r.json()).remainingMs;
      } catch { /* offline: keep counting locally */ }
    };
    void beat();
    const hb = window.setInterval(beat, HEARTBEAT_MS);
    const tick = window.setInterval(() => {
      if (endsAtRef.current === null) return;
      const left = endsAtRef.current - Date.now();
      setRemaining(Math.max(0, left));
      if (left <= 0) setPhase('expired');
    }, 1000);
    return () => { alive = false; clearInterval(hb); clearInterval(tick); };
  }, [allocationId]);

  useEffect(() => { if (phase === 'expired') void stop(); }, [phase, stop]);
  useEffect(() => () => { void stop(); }, [stop]);

  const mmss = remaining === null ? '--:--'
    : `${String(Math.floor(remaining / 60000)).padStart(2, '0')}:${String(Math.floor((remaining % 60000) / 1000)).padStart(2, '0')}`;
  const active = phase === 'scanning' || phase === 'starting';
  const flashColor = {
    ok: 'bg-[#CCFF00] text-[#0B0F19]',
    duplicate: 'bg-[#2563EB] text-white',
    rejected: 'bg-red-600 text-white',
    queued: 'bg-[#111827] text-white border border-[#2563EB]',
  };

  return (
    <section aria-label="Barcode scanner" className="mx-auto w-full max-w-md space-y-3 text-white">
      {/* status strip */}
      <div className="flex items-center justify-between rounded-xl bg-[#111827] px-4 py-2 text-sm">
        <span aria-live="polite" className={online ? 'text-[#A3E635]' : 'text-amber-400'}>
          ● {online ? 'Online' : 'Offline'}{pending > 0 && ` · ${pending} queued`}
        </span>
        <span className="font-mono tabular-nums" aria-label="Time remaining">{mmss}</span>
        <span className="text-slate-300"><strong className="tabular-nums text-lime-400">{count}</strong> scanned</span>
      </div>

      {/* viewport */}
      <div className="relative aspect-[3/4] w-full overflow-hidden rounded-2xl border-2 border-[#2563EB] bg-[#0B0F19]">
        <div id={READER_ID} className="h-full w-full [&_video]:h-full [&_video]:w-full [&_video]:object-cover" />

        {phase === 'scanning' && (
          <div aria-hidden className="pointer-events-none absolute inset-0 grid place-items-center">
            <div className={`relative h-[40%] w-[85%] rounded-xl border-2 ${flash?.kind === 'ok' ? 'border-[#CCFF00] shadow-[0_0_24px_#CCFF00]' : 'border-[#CCFF00]/80'} transition-shadow`}>
              <span className="absolute inset-x-2 top-1/2 h-0.5 animate-pulse bg-[#CCFF00]" />
            </div>
          </div>
        )}

        {flash && (
          <div role="status" className={`absolute inset-x-3 bottom-3 rounded-xl px-4 py-3 text-center text-sm font-semibold ${flashColor[flash.kind]}`}>
            {flash.text}
          </div>
        )}

        {phase === 'idle' && (
          <Overlay title="Ready to scan" body="Point the camera at a student's ID barcode.">
            <button onClick={start} className="min-h-11 min-w-44 rounded-xl border border-blue-400/30 bg-gradient-to-r from-blue-600 to-blue-500 px-6 font-semibold text-white shadow-[0_0_20px_rgba(37,99,235,0.3)] focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-300">Start scanning</button>
          </Overlay>
        )}
        {phase === 'starting' && <Overlay title="Starting camera…" body="Allow camera access if prompted." spinner />}
        {phase === 'denied' && (
          <Overlay title="Camera access blocked" body="Enable the camera for this site in your browser's address-bar settings, then retry.">
            <button onClick={start} className="min-h-11 rounded-xl bg-[#2563EB] px-6 font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-300">Try again</button>
          </Overlay>
        )}
        {phase === 'no-camera' && <Overlay title="No camera found" body="Use a device with a camera, or enter the roll number manually." />}
        {phase === 'error' && (
          <Overlay title="Scanner error" body="Something went wrong starting the camera.">
            <button onClick={start} className="min-h-11 rounded-xl bg-[#2563EB] px-6 font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-300">Retry</button>
          </Overlay>
        )}
        {phase === 'expired' && (
          <Overlay title="Session closed" body="This exam window has ended or your access was revoked. Scanning is disabled." />
        )}
      </div>

      {/* controls */}
      <div className="flex gap-3">
        {torchSupported && (
          <button onClick={toggleTorch} aria-pressed={torchOn}
            className={`min-h-11 flex-1 rounded-xl px-4 font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-300 ${torchOn ? 'bg-white text-[#0B0F19]' : 'bg-[#2563EB]'}`}>
            {torchOn ? 'Flash on' : 'Flash off'}
          </button>
        )}
        {active && (
          <button onClick={() => { void stop(); setPhase('idle'); }}
            className="min-h-11 flex-1 rounded-xl border border-[#2563EB] px-4 font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-300">
            Stop
          </button>
        )}
      </div>
    </section>
  );
}

function Overlay({ title, body, children, spinner }: { title: string; body: string; children?: React.ReactNode; spinner?: boolean }) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-[#0B0F19]/95 p-6 text-center">
      {spinner && <span aria-hidden className="h-8 w-8 animate-spin rounded-full border-4 border-[#2563EB] border-t-blue-300" />}
      <h2 className="text-lg font-bold">{title}</h2>
      <p className="max-w-xs text-sm text-slate-300">{body}</p>
      {children}
    </div>
  );
}
