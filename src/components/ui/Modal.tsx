'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';

/** Accessible modal on the native <dialog>: focus trap, Escape to close, inert background. */
export function Modal({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  return (
    <dialog ref={ref} onClose={onClose} onClick={(e) => { if (e.target === ref.current) onClose(); }}
      aria-labelledby="modal-title"
      className="m-auto w-[calc(100%-2rem)] max-w-lg rounded-2xl border border-line bg-surface p-0 text-fg shadow-2xl backdrop:bg-midnight/70 backdrop:backdrop-blur-sm">
      <div className="p-5 sm:p-6">
        <div className="mb-4 flex items-start justify-between gap-4">
          <h2 id="modal-title" className="text-lg font-bold">{title}</h2>
          <button onClick={onClose} aria-label="Close dialog" className="grid h-11 w-11 shrink-0 place-items-center rounded-lg text-muted hover:text-fg">✕</button>
        </div>
        {open && children}
      </div>
    </dialog>
  );
}

/** Confirmation modal for destructive actions. `action` runs on confirm. */
export function ConfirmButton({ label, title, body, confirmLabel = 'Confirm', action, className = 'btn-danger' }: {
  label: string; title: string; body: string; confirmLabel?: string; className?: string; action: () => Promise<void> | void;
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  return (
    <>
      <button type="button" className={className} onClick={() => setOpen(true)}>{label}</button>
      <Modal open={open} onClose={() => setOpen(false)} title={title}>
        <p className="text-sm text-muted">{body}</p>
        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button className="btn-ghost" onClick={() => setOpen(false)} autoFocus>Cancel</button>
          <button className="btn-danger" disabled={busy}
            onClick={async () => { setBusy(true); try { await action(); } finally { setBusy(false); setOpen(false); } }}>
            {busy ? 'Working…' : confirmLabel}
          </button>
        </div>
      </Modal>
    </>
  );
}
