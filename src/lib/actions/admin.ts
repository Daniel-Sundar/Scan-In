'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { audit } from '@/lib/audit';
import { requireRole } from '@/lib/auth/guards';
import { createAdminClient, createClient } from '@/lib/supabase/server';
import type { FormState } from './types';

const flat = (e: z.ZodError) => Object.fromEntries(e.issues.map((i) => [String(i.path[0]), i.message]));

/* ---------- single student ---------- */
const StudentSchema = z.object({
  roll_no: z.string().trim().regex(/^[A-Za-z0-9][A-Za-z0-9._-]{2,39}$/, 'Use 3-40 letters, digits or . _ -'),
  full_name: z.string().trim().min(1, 'Name is required').max(120).transform((s) => s.replace(/^[=+\-@]+/, '')),
  department: z.string().trim().max(80).optional(),
  year: z.coerce.number().int().min(1, 'Year 1-8').max(8, 'Year 1-8').optional().or(z.literal('').transform(() => undefined)),
});

export async function addStudent(_: FormState, fd: FormData): Promise<FormState> {
  const admin = await requireRole('admin');
  if (fd.get('consent') !== 'on') return { errors: { consent: 'Confirm you are authorised to record this data' } };
  const p = StudentSchema.safeParse(Object.fromEntries(fd));
  if (!p.success) return { errors: flat(p.error) };

  const supabase = await createClient();
  const { error } = await supabase.from('students').insert({ ...p.data, department: p.data.department || null, year: p.data.year ?? null, created_by: admin.id });
  if (error?.code === '23505') return { errors: { roll_no: 'This roll number already exists' } };
  if (error) return { message: 'Could not save the student. Please try again.' };
  await audit(admin.id, 'student.create', 'students', p.data.roll_no);
  revalidatePath('/admin/students');
  redirect('/success?type=student');
}

/* ---------- teacher whitelist ---------- */
export async function whitelistTeacher(_: FormState, fd: FormData): Promise<FormState> {
  const admin = await requireRole('admin');
  const p = z.object({ email: z.string().trim().toLowerCase().email('Enter a valid email').max(254) }).safeParse(Object.fromEntries(fd));
  if (!p.success) return { errors: flat(p.error) };
  if (fd.get('consent') !== 'on') return { errors: { consent: 'Confirm the teacher has agreed to be registered' } };

  const supabase = await createClient();
  const { error } = await supabase.from('teacher_whitelist').insert({ email: p.data.email, added_by: admin.id });
  if (error?.code === '23505') return { errors: { email: 'Already whitelisted' } };
  if (error) return { message: 'Could not add the teacher.' };
  await audit(admin.id, 'teacher.whitelist', 'teacher_whitelist', p.data.email);
  revalidatePath('/admin/teachers');
  redirect('/success?type=teacher');
}

export async function removeWhitelist(email: string) {
  const admin = await requireRole('admin');
  const supabase = await createClient();
  await supabase.from('teacher_whitelist').delete().eq('email', email);
  await audit(admin.id, 'teacher.unwhitelist', 'teacher_whitelist', email);
  revalidatePath('/admin/teachers');
}

/* ---------- allocation (exam + hall + teacher + window + roster) ---------- */
const AllocSchema = z.object({
  teacher_id: z.string().uuid('Choose a teacher'),
  exam_code: z.string().trim().min(2, 'Exam code required').max(30),
  exam_title: z.string().trim().min(2, 'Title required').max(120),
  exam_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Pick a date'),
  hall: z.string().trim().min(1, 'Hall required').max(60),
  starts: z.string().min(1, 'Start required'),
  ends: z.string().min(1, 'End required'),
  tz: z.coerce.number().int().min(-840).max(840), // browser getTimezoneOffset()
  department: z.string().trim().max(80).optional(),
  rolls: z.string().max(100000).optional(),
});

const toUtc = (local: string, offsetMin: number) => new Date(Date.parse(local + ':00Z') + offsetMin * 60000);

export async function createAllocation(_: FormState, fd: FormData): Promise<FormState> {
  const admin = await requireRole('admin');
  const p = AllocSchema.safeParse(Object.fromEntries(fd));
  if (!p.success) return { errors: flat(p.error) };
  const d = p.data;
  const starts = toUtc(d.starts, d.tz);
  const ends = toUtc(d.ends, d.tz);
  if (!(ends > starts)) return { errors: { ends: 'End must be after start' } };
  if (ends.getTime() < Date.now()) return { errors: { ends: 'End time is already in the past' } };

  const supabase = await createClient();
  let q = supabase.from('students').select('id');
  const rolls = (d.rolls ?? '').split(/[\s,;]+/).map((r) => r.trim()).filter(Boolean);
  if (rolls.length) q = q.in('roll_no', rolls.slice(0, 5000));
  else if (d.department) q = q.eq('department', d.department);
  else return { errors: { rolls: 'Pick a department or paste roll numbers' } };
  const { data: students } = await q.limit(5000);
  if (!students?.length) return { errors: { rolls: 'No matching students found' } };

  const { data: exam, error: e1 } = await supabase
    .from('exams')
    .upsert({ code: d.exam_code, title: d.exam_title, exam_date: d.exam_date, created_by: admin.id }, { onConflict: 'code' })
    .select('id').single();
  if (e1 || !exam) return { message: 'Could not save the exam.' };

  const { data: alloc, error: e2 } = await supabase
    .from('allocations')
    .insert({ exam_id: exam.id, teacher_id: d.teacher_id, hall: d.hall, starts_at: starts.toISOString(), ends_at: ends.toISOString(), created_by: admin.id })
    .select('id').single();
  if (e2?.code === '23P01') return { errors: { starts: 'This teacher already has an allocation overlapping that time' } };
  if (e2 || !alloc) return { message: 'Could not create the allocation.' };

  const links = students.map((s: { id: string }) => ({ allocation_id: alloc.id, student_id: s.id }));
  for (let i = 0; i < links.length; i += 500) await supabase.from('allocation_students').insert(links.slice(i, i + 500));
  await audit(admin.id, 'allocation.create', 'allocations', alloc.id, { hall: d.hall, students: links.length });
  revalidatePath('/admin/allocations');
  redirect('/success?type=allocation');
}

export async function revokeAllocation(id: string) {
  const admin = await requireRole('admin');
  const supabase = await createClient();
  await supabase.from('allocations').update({ revoked_at: new Date().toISOString() }).eq('id', id);
  await audit(admin.id, 'allocation.revoke', 'allocations', id);
  revalidatePath('/admin/allocations');
}

/* ---------- right to be forgotten: admin processes a request ---------- */
export async function processDeletion(requestId: string) {
  const admin = await requireRole('admin');
  const db = await createAdminClient();
  const { data: r } = await db.from('deletion_requests').select('id,user_id,status').eq('id', requestId).single();
  if (!r || r.status !== 'pending') return;
  const { data: u } = await db.from('users').select('email').eq('id', r.user_id).single();
  // Attendance logs must remain (exam integrity), so personal data is ANONYMISED, not row-deleted.
  await db.from('users').update({ full_name: 'Deleted user', email: `deleted-${r.user_id}@invalid.local`, is_active: false }).eq('id', r.user_id);
  if (u?.email) await db.from('teacher_whitelist').delete().eq('email', u.email);
  await db.auth.admin.updateUserById(r.user_id, { email: `deleted-${r.user_id}@invalid.local`, ban_duration: '876000h' });
  await db.from('deletion_requests').update({ status: 'completed', resolved_at: new Date().toISOString() }).eq('id', requestId);
  await audit(admin.id, 'user.anonymised', 'users', r.user_id);
  revalidatePath('/dashboard');
}
