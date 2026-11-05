'use client';

import { useActionState, useEffect, useRef } from 'react';
import { addStudent, createAllocation, whitelistTeacher } from '@/lib/actions/admin';
import { initial } from '@/lib/actions/types';
import { Consent, Field, FormMessage, SubmitButton } from '../ui/Form';

export function AddStudentForm() {
  const [state, action] = useActionState(addStudent, initial);
  const e = state.errors ?? {};
  return (
    <form action={action} className="space-y-3">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Field label="Roll number (barcode value)" name="roll_no" required pattern="[A-Za-z0-9][A-Za-z0-9._\-]{2,39}" title="3-40 letters, digits or . _ -" error={e.roll_no} />
        <Field label="Full name" name="full_name" required maxLength={120} error={e.full_name} />
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Field label="Department" name="department" maxLength={80} error={e.department} />
        <Field label="Year (1-8)" name="year" type="number" min={1} max={8} error={e.year} />
      </div>
      <Consent error={e.consent}>I am authorised to record this student’s details for exam attendance.</Consent>
      <FormMessage state={state} />
      <SubmitButton pendingText="Saving…">Add student</SubmitButton>
    </form>
  );
}

export function WhitelistForm() {
  const [state, action] = useActionState(whitelistTeacher, initial);
  const e = state.errors ?? {};
  return (
    <form action={action} className="space-y-4">
      <Field label="Teacher email" name="email" type="email" required error={e.email} hint="Only this address will be able to register." />
      <Consent error={e.consent}>The teacher has agreed to an invigilator account being created for them.</Consent>
      <FormMessage state={state} />
      <SubmitButton pendingText="Adding…">Whitelist teacher</SubmitButton>
    </form>
  );
}

export function AllocationForm({ teachers, departments }: { teachers: { id: string; full_name: string; email: string }[]; departments: string[] }) {
  const [state, action] = useActionState(createAllocation, initial);
  const tz = useRef<HTMLInputElement>(null);
  useEffect(() => { if (tz.current) tz.current.value = String(new Date().getTimezoneOffset()); }, []);
  const e = state.errors ?? {};
  return (
    <form action={action} className="space-y-3">
      <input ref={tz} type="hidden" name="tz" defaultValue="0" />
      <div>
        <label htmlFor="teacher_id" className="label">Teacher *</label>
        <select id="teacher_id" name="teacher_id" required aria-invalid={!!e.teacher_id} className={`input ${e.teacher_id ? 'input-bad' : ''}`} defaultValue="">
          <option value="" disabled>Select a registered teacher…</option>
          {teachers.map((t) => <option key={t.id} value={t.id}>{t.full_name} ({t.email})</option>)}
        </select>
        {e.teacher_id && <p role="alert" className="mt-1 text-xs text-red-500">{e.teacher_id}</p>}
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Field label="Exam code" name="exam_code" required maxLength={30} error={e.exam_code} />
        <div className="md:col-span-2"><Field label="Exam title" name="exam_title" required maxLength={120} error={e.exam_title} /></div>
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Field label="Exam date" name="exam_date" type="date" required error={e.exam_date} />
        <Field label="Hall" name="hall" required maxLength={60} error={e.hall} />
        <Field label="Access starts" name="starts" type="datetime-local" required error={e.starts} />
        <Field label="Access ends (auto-revokes)" name="ends" type="datetime-local" required error={e.ends} />
      </div>
      <fieldset className="space-y-3 rounded-xl border border-line p-4">
        <legend className="px-2 text-xs font-semibold uppercase tracking-wider text-slate-900 dark:text-slate-200">Student set</legend>
        <div>
          <label htmlFor="department" className="label">By department</label>
          <select id="department" name="department" className="input" defaultValue="">
            <option value="">— none —</option>
            {departments.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="rolls" className="label">…or paste roll numbers (overrides department)</label>
          <textarea id="rolls" name="rolls" rows={3} className={`input py-3 font-mono ${e.rolls ? 'input-bad' : ''}`} aria-invalid={!!e.rolls} />
          {e.rolls && <p role="alert" className="mt-1 text-xs text-red-500">{e.rolls}</p>}
        </div>
      </fieldset>
      <FormMessage state={state} />
      <SubmitButton variant="btn-primary" pendingText="Creating…">Create allocation</SubmitButton>
    </form>
  );
}
