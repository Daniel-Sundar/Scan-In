-- =====================================================================
-- ScanIn · Migration 0001 · Schema + Row-Level Security
-- Target: Supabase (PostgreSQL 15+)
-- Principles: deny by default, server-time authority, least privilege,
--             teachers see ONLY rows tied to their ACTIVE allocation.
-- =====================================================================

create extension if not exists citext;
create extension if not exists btree_gist;   -- for no-double-booking constraint

-- ---------------------------------------------------------------------
-- 0. Enums
-- ---------------------------------------------------------------------
create type public.user_role as enum ('admin', 'teacher');
create type public.scan_source as enum ('camera', 'manual', 'offline_sync');
create type public.deletion_status as enum ('pending', 'completed', 'rejected');

-- ---------------------------------------------------------------------
-- 1. Teacher whitelist (admin-controlled gate for registration)
-- ---------------------------------------------------------------------
create table public.teacher_whitelist (
  email       citext primary key,
  added_by    uuid not null references auth.users(id) on delete restrict,
  created_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- 2. users (profile row 1:1 with auth.users)
-- ---------------------------------------------------------------------
create table public.users (
  id          uuid primary key references auth.users(id) on delete cascade,
  email       citext not null unique,
  full_name   text   not null check (char_length(full_name) between 1 and 120),
  role        public.user_role not null default 'teacher',
  is_active   boolean not null default true,
  consent_at  timestamptz,                      -- explicit consent record (GDPR)
  created_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- 3. students (data-minimised: no phone, address, photo)
-- ---------------------------------------------------------------------
create table public.students (
  id          uuid primary key default gen_random_uuid(),
  roll_no     text not null unique check (roll_no ~ '^[A-Za-z0-9._-]{3,40}$'), -- = barcode payload
  full_name   text not null check (char_length(full_name) between 1 and 120),
  department  text,
  year        smallint check (year between 1 and 8),
  created_by  uuid references public.users(id) on delete set null,
  created_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- 4. exams
-- ---------------------------------------------------------------------
create table public.exams (
  id          uuid primary key default gen_random_uuid(),
  code        text not null unique,
  title       text not null,
  exam_date   date not null,
  created_by  uuid references public.users(id) on delete set null,
  created_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- 5. allocations (teacher + hall + exam + hard time window)
-- ---------------------------------------------------------------------
create table public.allocations (
  id          uuid primary key default gen_random_uuid(),
  exam_id     uuid not null references public.exams(id) on delete cascade,
  teacher_id  uuid not null references public.users(id) on delete cascade,
  hall        text not null,
  starts_at   timestamptz not null,
  ends_at     timestamptz not null,
  revoked_at  timestamptz,                      -- admin can kill access early
  created_by  uuid references public.users(id) on delete set null,
  created_at  timestamptz not null default now(),
  constraint allocation_window_valid check (ends_at > starts_at),
  -- a teacher cannot hold two overlapping live allocations
  constraint no_teacher_overlap exclude using gist (
    teacher_id with =,
    tstzrange(starts_at, ends_at) with &&
  ) where (revoked_at is null)
);
create index allocations_teacher_idx on public.allocations (teacher_id, starts_at, ends_at);

-- roster of an allocation (the "student set")
create table public.allocation_students (
  allocation_id uuid not null references public.allocations(id) on delete cascade,
  student_id    uuid not null references public.students(id)    on delete cascade,
  primary key (allocation_id, student_id)
);
create index allocation_students_student_idx on public.allocation_students (student_id);

-- ---------------------------------------------------------------------
-- 6. attendance_logs (append-only)
-- ---------------------------------------------------------------------
create table public.attendance_logs (
  id               uuid primary key default gen_random_uuid(),
  allocation_id    uuid not null references public.allocations(id) on delete restrict,
  exam_id          uuid not null references public.exams(id)       on delete restrict,
  student_id       uuid not null references public.students(id)    on delete restrict,
  teacher_id       uuid not null references public.users(id)       on delete restrict,
  scanned_at       timestamptz not null default now(),   -- SERVER time, authoritative
  client_scanned_at timestamptz,                         -- device time (offline queue), informational
  client_scan_id   uuid not null,                        -- idempotency key for offline replay
  source           public.scan_source not null default 'camera',
  unique (exam_id, student_id),                          -- one check-in per student per exam
  unique (client_scan_id)
);
create index attendance_alloc_idx on public.attendance_logs (allocation_id, scanned_at desc);

-- ---------------------------------------------------------------------
-- 7. Supporting tables: audit, deletion requests, contact form
-- ---------------------------------------------------------------------
create table public.audit_events (
  id          bigint generated always as identity primary key,
  actor_id    uuid references public.users(id) on delete set null,
  action      text not null,                 -- e.g. 'allocation.create', 'scan.denied'
  entity      text,
  entity_id   text,
  meta        jsonb not null default '{}',
  created_at  timestamptz not null default now()
);
create index audit_events_created_idx on public.audit_events (created_at desc);

create table public.deletion_requests (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.users(id) on delete cascade,
  reason      text,
  status      public.deletion_status not null default 'pending',
  created_at  timestamptz not null default now(),
  resolved_at timestamptz
);

create table public.contact_messages (
  id          uuid primary key default gen_random_uuid(),
  name        text not null check (char_length(name) <= 120),
  email       citext not null,
  message     text not null check (char_length(message) between 5 and 4000),
  consent     boolean not null check (consent),   -- explicit consent required
  created_at  timestamptz not null default now()
);

-- =====================================================================
-- HELPER FUNCTIONS (SECURITY DEFINER, pinned search_path)
-- They bypass RLS internally to avoid policy recursion, and expose only
-- boolean answers scoped to auth.uid().
-- =====================================================================
create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.users
    where id = auth.uid() and role = 'admin' and is_active
  );
$$;

create or replace function public.is_active_teacher()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.users
    where id = auth.uid() and role = 'teacher' and is_active
  );
$$;

-- Is this allocation owned by the caller AND inside its time window right now?
create or replace function public.owns_live_allocation(p_allocation uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select public.is_active_teacher() and exists (
    select 1 from public.allocations a
    where a.id = p_allocation
      and a.teacher_id = auth.uid()
      and a.revoked_at is null
      and now() >= a.starts_at
      and now() <  a.ends_at
  );
$$;

-- Is this student on the roster of one of the caller's live allocations?
create or replace function public.student_in_live_allocation(p_student uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select public.is_active_teacher() and exists (
    select 1
    from public.allocation_students s
    join public.allocations a on a.id = s.allocation_id
    where s.student_id = p_student
      and a.teacher_id = auth.uid()
      and a.revoked_at is null
      and now() >= a.starts_at
      and now() <  a.ends_at
  );
$$;

-- Is this exam referenced by one of the caller's live allocations?
create or replace function public.exam_in_live_allocation(p_exam uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select public.is_active_teacher() and exists (
    select 1 from public.allocations a
    where a.exam_id = p_exam
      and a.teacher_id = auth.uid()
      and a.revoked_at is null
      and now() >= a.starts_at
      and now() <  a.ends_at
  );
$$;

-- =====================================================================
-- SIGN-UP GATE: only whitelisted emails may create an account.
-- Runs inside the auth.users insert; raising aborts the signup.
-- The very first admin is seeded manually (see bottom of file).
-- =====================================================================
create or replace function public.handle_new_auth_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from public.teacher_whitelist w where w.email = new.email::citext) then
    raise exception 'Email is not authorised to register. Contact your administrator.'
      using errcode = '42501';
  end if;

  insert into public.users (id, email, full_name, role, consent_at)
  values (
    new.id,
    new.email,
    coalesce(nullif(new.raw_user_meta_data ->> 'full_name', ''), split_part(new.email, '@', 1)),
    'teacher',                                   -- role is NEVER read from client metadata
    case when (new.raw_user_meta_data ->> 'consent') = 'true' then now() end
  );
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_auth_user();

-- Block privilege escalation / identity tampering on profile updates.
create or replace function public.guard_user_update()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then
    if new.role      is distinct from old.role
    or new.is_active is distinct from old.is_active
    or new.email     is distinct from old.email
    or new.id        is distinct from old.id then
      raise exception 'Not permitted to change role, status or email' using errcode = '42501';
    end if;
  end if;
  return new;
end $$;

create trigger guard_user_update
  before update on public.users
  for each row execute function public.guard_user_update();

-- Scan integrity: denormalised ids must match the allocation (no spoofing).
create or replace function public.guard_attendance_insert()
returns trigger language plpgsql security definer set search_path = public as $$
declare a public.allocations;
begin
  select * into a from public.allocations where id = new.allocation_id;
  if not found
     or a.exam_id    <> new.exam_id
     or a.teacher_id <> new.teacher_id
     or not exists (select 1 from public.allocation_students
                    where allocation_id = new.allocation_id and student_id = new.student_id) then
    raise exception 'Scan does not match allocation' using errcode = '42501';
  end if;
  new.scanned_at := now();                       -- never trust client clock
  return new;
end $$;

create trigger guard_attendance_insert
  before insert on public.attendance_logs
  for each row execute function public.guard_attendance_insert();

-- =====================================================================
-- PRIVILEGES: anon gets nothing. authenticated gets table grants that
-- RLS then narrows. FORCE RLS so even table owners obey policies
-- (service_role bypasses by design — keep that key server-side only).
-- =====================================================================
revoke all on all tables    in schema public from anon, authenticated;
revoke all on all functions in schema public from anon;

grant select, insert, update, delete on
  public.teacher_whitelist, public.users, public.students, public.exams,
  public.allocations, public.allocation_students, public.deletion_requests
  to authenticated;
grant select, insert on public.attendance_logs to authenticated;
grant select on public.audit_events to authenticated;          -- inserts via server only
grant insert on public.contact_messages to anon, authenticated; -- public contact form
grant select on public.contact_messages to authenticated;
grant execute on function
  public.is_admin(), public.is_active_teacher(), public.owns_live_allocation(uuid),
  public.student_in_live_allocation(uuid), public.exam_in_live_allocation(uuid)
  to authenticated;

alter table public.teacher_whitelist   enable row level security;
alter table public.users               enable row level security;
alter table public.students            enable row level security;
alter table public.exams               enable row level security;
alter table public.allocations         enable row level security;
alter table public.allocation_students enable row level security;
alter table public.attendance_logs     enable row level security;
alter table public.audit_events        enable row level security;
alter table public.deletion_requests   enable row level security;
alter table public.contact_messages    enable row level security;

alter table public.teacher_whitelist   force row level security;
alter table public.users               force row level security;
alter table public.students            force row level security;
alter table public.exams               force row level security;
alter table public.allocations         force row level security;
alter table public.allocation_students force row level security;
alter table public.attendance_logs     force row level security;
alter table public.audit_events        force row level security;
alter table public.deletion_requests   force row level security;
alter table public.contact_messages    force row level security;

-- =====================================================================
-- RLS POLICIES
-- =====================================================================

-- teacher_whitelist: admin only ---------------------------------------
create policy whitelist_admin_all on public.teacher_whitelist
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- users ---------------------------------------------------------------
create policy users_select_self_or_admin on public.users
  for select to authenticated
  using (id = auth.uid() or public.is_admin());

create policy users_update_self on public.users          -- name / consent only (trigger blocks the rest)
  for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

create policy users_admin_all on public.users
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- students: admin full; teacher only rostered + live window -------------
create policy students_admin_all on public.students
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy students_teacher_select on public.students
  for select to authenticated
  using (public.student_in_live_allocation(id));

-- exams ---------------------------------------------------------------
create policy exams_admin_all on public.exams
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy exams_teacher_select on public.exams
  for select to authenticated
  using (public.exam_in_live_allocation(id));

-- allocations ---------------------------------------------------------
create policy allocations_admin_all on public.allocations
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy allocations_teacher_select on public.allocations
  for select to authenticated
  using (public.owns_live_allocation(id));          -- expired => row vanishes

-- allocation_students -------------------------------------------------
create policy alloc_students_admin_all on public.allocation_students
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy alloc_students_teacher_select on public.allocation_students
  for select to authenticated
  using (public.owns_live_allocation(allocation_id));

-- attendance_logs: teachers INSERT/SELECT inside window only; no UPDATE/DELETE
-- policies exist for anyone => append-only, tamper-evident.
create policy attendance_admin_select on public.attendance_logs
  for select to authenticated
  using (public.is_admin());

create policy attendance_teacher_select on public.attendance_logs
  for select to authenticated
  using (public.owns_live_allocation(allocation_id));

create policy attendance_teacher_insert on public.attendance_logs
  for insert to authenticated
  with check (
    teacher_id = auth.uid()
    and public.owns_live_allocation(allocation_id)
    and public.student_in_live_allocation(student_id)
  );

-- audit_events: admin read-only (writes via service_role on the server) --
create policy audit_admin_select on public.audit_events
  for select to authenticated
  using (public.is_admin());

-- deletion_requests ---------------------------------------------------
create policy deletion_self_insert on public.deletion_requests
  for insert to authenticated
  with check (user_id = auth.uid() and status = 'pending');

create policy deletion_self_select on public.deletion_requests
  for select to authenticated
  using (user_id = auth.uid() or public.is_admin());

create policy deletion_admin_update on public.deletion_requests
  for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- contact_messages: anyone may submit (consent enforced by CHECK); admin reads
create policy contact_public_insert on public.contact_messages
  for insert to anon, authenticated
  with check (consent);

create policy contact_admin_select on public.contact_messages
  for select to authenticated
  using (public.is_admin());

-- =====================================================================
-- BOOTSTRAP (run ONCE manually in the SQL editor, never from the app):
--   1. Create the first admin in Supabase Auth dashboard.
--   2. insert into public.users (id, email, full_name, role)
--        values ('<auth uid>', 'admin@college.edu', 'Admin', 'admin');
--   (The signup trigger only creates teachers; admins are never self-served.)
-- =====================================================================
