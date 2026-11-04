/* In-memory stand-in for Supabase, used only when LOCAL_MODE=true.
 * Implements just the query surface this app uses. Data resets on server restart. */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { cookies } from 'next/headers';

export const LOCAL_COOKIE = 'local_user';
export const isLocalMode = () => process.env.LOCAL_MODE === 'true';
export const localRole = (email: string) => (email.toLowerCase().startsWith('admin') ? 'admin' : 'teacher');

type Row = Record<string, any>;
type Store = Record<string, Row[]>;

const uid = () => crypto.randomUUID();
const ADMIN_ID = '00000000-0000-4000-8000-000000000001';
const TEACHER_ID = '00000000-0000-4000-8000-000000000002';

function seed(): Store {
  const now = Date.now();
  const iso = (ms: number) => new Date(ms).toISOString();
  const students = [
    ['CS001', 'Asha Rao', 'CSE', 2], ['CS002', 'Ben Thomas', 'CSE', 2], ['CS003', 'Chitra Nair', 'CSE', 2],
    ['EC001', 'Dev Patel', 'ECE', 3], ['EC002', 'Esha Iyer', 'ECE', 3],
  ].map(([roll_no, full_name, department, year]) => ({ id: uid(), roll_no, full_name, department, year, created_by: ADMIN_ID, created_at: iso(now) }));
  const exam = { id: uid(), code: 'DEMO101', title: 'Demo Exam', exam_date: iso(now).slice(0, 10), created_by: ADMIN_ID };
  const alloc = { id: uid(), exam_id: exam.id, teacher_id: TEACHER_ID, hall: 'Hall A', starts_at: iso(now - 3600e3), ends_at: iso(now + 7 * 86400e3), revoked_at: null, created_by: ADMIN_ID };
  return {
    users: [
      { id: ADMIN_ID, email: 'admin@local.test', full_name: 'Local Admin', role: 'admin', is_active: true },
      { id: TEACHER_ID, email: 'teacher@local.test', full_name: 'Local Teacher', role: 'teacher', is_active: true },
    ],
    teacher_whitelist: [{ email: 'teacher@local.test', added_by: ADMIN_ID, created_at: iso(now) }],
    students, exams: [exam], allocations: [alloc],
    allocation_students: students.map((s) => ({ allocation_id: alloc.id, student_id: s.id })),
    attendance_logs: [], audit_events: [], deletion_requests: [], contact_messages: [],
  };
}

const g = globalThis as any;
const db = (): Store => (g.__scaninLocalStore ??= seed());

const UNIQUE: Record<string, string[][]> = {
  students: [['roll_no']], exams: [['code']], teacher_whitelist: [['email']], users: [['email']],
  attendance_logs: [['allocation_id', 'student_id'], ['client_scan_id']],
};
const EMBED: Record<string, Record<string, [string, string]>> = {
  allocations: { exams: ['exams', 'exam_id'], users: ['users', 'teacher_id'] },
  allocation_students: { students: ['students', 'student_id'] },
  deletion_requests: { users: ['users', 'user_id'] },
  attendance_logs: { students: ['students', 'student_id'], allocations: ['allocations', 'allocation_id'] },
};

function splitTop(s: string) {
  const out: string[] = []; let depth = 0, cur = '';
  for (const ch of s) {
    if (ch === '(') depth++; if (ch === ')') depth--;
    if (ch === ',' && !depth) { out.push(cur.trim()); cur = ''; } else cur += ch;
  }
  if (cur.trim()) out.push(cur.trim()); return out;
}

function project(store: Store, table: string, row: Row, cols: string): Row {
  const parts = splitTop(cols);
  if (parts.includes('*')) return { ...row };
  const out: Row = {};
  for (const p of parts) {
    const m = p.match(/^([\w]+)(?:!\w+)?\((.*)\)$/);
    if (m) {
      const rel = EMBED[table]?.[m[1]];
      const target = rel && store[rel[0]].find((r) => r.id === row[rel[1]]);
      out[m[1]] = target ? project(store, rel![0], target, m[2]) : null;
    } else out[p] = row[p];
  }
  return out;
}

class Builder implements PromiseLike<any> {
  private op: 'select' | 'insert' | 'update' | 'delete' | 'upsert' = 'select';
  private payload: any; private cols = '*'; private preds: ((r: Row) => boolean)[] = [];
  private order_?: [string, boolean]; private limit_?: number; private head = false; private count = false;
  private single_: 'single' | 'maybe' | null = null; private onConflict?: string; private returning = false;
  constructor(private table: string, private uid: string | null, private bypass: boolean) {}

  select(cols = '*', opts?: { count?: string; head?: boolean }) {
    this.cols = cols; this.returning = true;
    if (opts?.count) this.count = true; if (opts?.head) this.head = true; return this;
  }
  insert(p: any) { this.op = 'insert'; this.payload = p; return this; }
  upsert(p: any, o?: { onConflict?: string }) { this.op = 'upsert'; this.payload = p; this.onConflict = o?.onConflict; return this; }
  update(p: any) { this.op = 'update'; this.payload = p; return this; }
  delete() { this.op = 'delete'; return this; }
  eq(c: string, v: any) { this.preds.push((r) => r[c] === v); return this; }
  in(c: string, v: any[]) { this.preds.push((r) => v.includes(r[c])); return this; }
  is(c: string, v: any) { this.preds.push((r) => (r[c] ?? null) === v); return this; }
  not(c: string, _op: string, v: any) { this.preds.push((r) => (r[c] ?? null) !== v); return this; }
  lte(c: string, v: any) { this.preds.push((r) => r[c] <= v); return this; }
  gt(c: string, v: any) { this.preds.push((r) => r[c] > v); return this; }
  gte(c: string, v: any) { this.preds.push((r) => r[c] >= v); return this; }
  order(c: string, o?: { ascending?: boolean }) { this.order_ = [c, o?.ascending !== false]; return this; }
  limit(n: number) { this.limit_ = n; return this; }
  single() { this.single_ = 'single'; return this; }
  maybeSingle() { this.single_ = 'maybe'; return this; }
  then<A, B>(f?: any, r?: any): PromiseLike<A | B> { return Promise.resolve(this.run()).then(f, r); }

  /** Poor-man's RLS for non-service clients. */
  private visible(store: Store): Row[] {
    const rows = store[this.table];
    if (this.bypass) return rows;
    const me = store.users.find((u) => u.id === this.uid);
    if (!me) return [];
    if (me.role === 'admin') return rows;
    const now = new Date().toISOString();
    const live = store.allocations.filter((a) => a.teacher_id === me.id && !a.revoked_at && a.starts_at <= now && a.ends_at > now);
    const liveIds = new Set(live.map((a) => a.id));
    switch (this.table) {
      case 'allocations': return live;
      case 'allocation_students': return rows.filter((r) => liveIds.has(r.allocation_id));
      case 'students': { const ids = new Set(store.allocation_students.filter((r) => liveIds.has(r.allocation_id)).map((r) => r.student_id)); return rows.filter((r) => ids.has(r.id)); }
      case 'attendance_logs': return rows.filter((r) => r.teacher_id === me.id);
      case 'users': return rows.filter((r) => r.id === me.id);
      case 'exams': return rows.filter((r) => live.some((a) => a.exam_id === r.id));
      default: return rows;
    }
  }

  private run(): any {
    const store = db(); const t = this.table;
    if (!store[t]) return { data: null, error: { message: `no table ${t}` } };
    const err = (code: string) => ({ data: null, error: { code, message: code } });
    const fin = (rows: Row[]) => {
      let out = rows;
      if (this.order_) { const [c, asc] = this.order_; out = [...out].sort((a, b) => (a[c] > b[c] ? 1 : a[c] < b[c] ? -1 : 0) * (asc ? 1 : -1)); }
      if (this.limit_ != null) out = out.slice(0, this.limit_);
      const count = this.count ? rows.length : null;
      if (this.head) return { data: null, count, error: null };
      const data = out.map((r) => project(store, t, r, this.cols));
      if (this.single_) {
        if (!data[0]) return this.single_ === 'maybe' ? { data: null, count, error: null } : { data: null, count, error: { code: 'PGRST116', message: 'no rows' } };
        return { data: data[0], count, error: null };
      }
      return { data, count, error: null };
    };
    const matching = () => this.visible(store).filter((r) => this.preds.every((p) => p(r)));
    const conflict = (row: Row, skip?: Row) => (UNIQUE[t] ?? []).some((cols) => store[t].some((o) => o !== skip && cols.every((c) => row[c] != null && o[c] === row[c])));

    if (this.op === 'select') return fin(matching());
    if (this.op === 'insert' || this.op === 'upsert') {
      const list = (Array.isArray(this.payload) ? this.payload : [this.payload]).map((r: Row): Row => ({ id: t === 'allocation_students' ? undefined : uid(), created_at: new Date().toISOString(), ...(t === 'users' ? { is_active: true } : {}), ...(t === 'allocations' ? { revoked_at: null } : {}), ...(t === 'attendance_logs' ? { scanned_at: new Date().toISOString() } : {}), ...r }));
      const done: Row[] = [];
      for (const row of list) {
        if (t === 'allocation_students') delete row.id;
        if (this.op === 'upsert' && this.onConflict) {
          const ex = store[t].find((o) => o[this.onConflict!] === row[this.onConflict!]);
          if (ex) { const { id: _i, ...rest } = row; Object.assign(ex, rest); done.push(ex); continue; }
        }
        if (conflict(row)) return err('23505');
        store[t].push(row); done.push(row);
      }
      return this.returning ? fin(done) : { data: null, error: null };
    }
    if (this.op === 'update') { const rows = matching(); rows.forEach((r) => Object.assign(r, this.payload)); return this.returning ? fin(rows) : { data: null, error: null }; }
    const del = new Set(matching()); store[t] = store[t].filter((r) => !del.has(r));
    return { data: null, error: null };
  }
}

export async function createMockClient(bypass = false) {
  const store = await cookies();
  const email = store.get(LOCAL_COOKIE)?.value;
  const me = email ? db().users.find((u) => u.email === email && u.is_active) : undefined;
  const uidv = me?.id ?? null;
  return {
    from: (t: string) => new Builder(t, uidv, bypass),
    auth: {
      getUser: async () => (me ? { data: { user: { id: me.id, email: me.email } }, error: null } : { data: { user: null }, error: { message: 'no session' } }),
      signInWithPassword: async ({ email: e }: { email: string; password: string }) => {
        const u = db().users.find((x) => x.email === e && x.is_active);
        if (!u) return { data: null, error: { message: 'Invalid login credentials' } };
        store.set(LOCAL_COOKIE, e, { httpOnly: true, sameSite: 'lax', path: '/' });
        return { data: {}, error: null };
      },
      signUp: async ({ email: e, options }: any) => {
        const s = db();
        if (!s.teacher_whitelist.some((w) => w.email === e)) return { data: null, error: { message: 'not authorised' } };
        if (!s.users.some((u) => u.email === e)) s.users.push({ id: uid(), email: e, full_name: options?.data?.full_name ?? e, role: 'teacher', is_active: true });
        return { data: {}, error: null };
      },
      signOut: async () => { store.delete(LOCAL_COOKIE); return { error: null }; },
      exchangeCodeForSession: async () => ({ error: null }),
      admin: { updateUserById: async () => ({ data: null, error: null }) },
    },
  } as any;
}
