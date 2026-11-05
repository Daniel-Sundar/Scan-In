'use client';

import { useState, type InputHTMLAttributes, type ReactNode } from 'react';
import { useFormStatus } from 'react-dom';

type V = 'ok' | 'bad' | null;

/** Text input with live inline validation (red/green) driven by the browser's constraint API. */
export function Field({ label, name, error, hint, type = 'text', ...rest }: {
  label: string; name: string; error?: string; hint?: string;
} & InputHTMLAttributes<HTMLInputElement>) {
  const [v, setV] = useState<V>(null);
  const [msg, setMsg] = useState('');
  const [show, setShow] = useState(false);
  const id = `f-${name}`;
  const bad = !!error || v === 'bad';
  const shown = error || (v === 'bad' ? msg : '');
  const check = (el: HTMLInputElement) => {
    if (!el.value && !el.required) { setV(null); return; }
    setV(el.checkValidity() ? 'ok' : 'bad');
    setMsg(el.validationMessage);
  };
  const isPw = type === 'password';

  return (
    <div>
      <label htmlFor={id} className="label">{label}{rest.required && <span aria-hidden className="text-red-500"> *</span>}</label>
      <div className="relative">
        <input
          id={id} name={name} type={isPw && show ? 'text' : type}
          aria-invalid={bad} aria-describedby={`${id}-msg`}
          onBlur={(e) => check(e.currentTarget)}
          onInput={(e) => { if (v) check(e.currentTarget); }}
          className={`input ${isPw ? 'pr-14' : ''} ${bad ? 'input-bad' : v === 'ok' && !error ? 'input-ok' : ''}`}
          {...rest}
        />
        {isPw && (
          <button type="button" onClick={() => setShow((s) => !s)} aria-pressed={show}
            aria-label={show ? 'Hide password' : 'Show password'}
            className="absolute right-1 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-lg text-muted hover:text-fg">
            <svg aria-hidden width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              {show ? <><path d="M17.9 17.9A10.9 10.9 0 0 1 12 20C5 20 1 12 1 12a18.5 18.5 0 0 1 5-5.9M9.9 4.2A10.7 10.7 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.2 3.2M1 1l22 22" /></>
                : <><path d="M1 12S5 4 12 4s11 8 11 8-4 8-11 8S1 12 1 12z" /><circle cx="12" cy="12" r="3" /></>}
            </svg>
          </button>
        )}
      </div>
      <p id={`${id}-msg`} aria-live="polite" className={`mt-1 min-h-[1.25rem] text-xs ${bad ? 'text-rose-600 dark:text-rose-400' : 'text-slate-600 dark:text-slate-400'}`}>
        {shown || hint || (v === 'ok' ? <span className="text-emerald-600 dark:text-emerald-400">✓ Looks good</span> : '')}
      </p>
    </div>
  );
}

export function Consent({ name = 'consent', error, children }: { name?: string; error?: string; children: ReactNode }) {
  return (
    <div>
      <label className="flex min-h-[44px] cursor-pointer items-start gap-3 text-sm">
        <input type="checkbox" name={name} required aria-invalid={!!error}
          className="mt-0.5 h-5 w-5 shrink-0 rounded border-line accent-blue-600" />
        <span>{children}</span>
      </label>
      {error && <p role="alert" className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  );
}

export function SubmitButton({ children, variant = 'btn-primary', pendingText = 'Working…' }: { children: ReactNode; variant?: string; pendingText?: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={`${variant} w-full sm:w-auto`}>
      {pending && <span aria-hidden className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />}
      {pending ? pendingText : children}
    </button>
  );
}

export function FormMessage({ state }: { state: { ok?: boolean; message?: string } }) {
  if (!state.message) return null;
  return (
    <p role={state.ok ? 'status' : 'alert'}
      className={`rounded-xl border px-4 py-3 text-sm ${state.ok ? 'border-lime-soft bg-lime/10' : 'border-red-500 bg-red-500/10 text-red-500'}`}>
      {state.ok ? '✓ ' : ''}{state.message}
    </p>
  );
}
