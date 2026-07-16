-- ajmo.events waitlist — run once in the Supabase SQL editor
-- (project "ajmo app", ref kzyubtvevpfkwvrudtko).
--
-- Public visitors may INSERT their email and nothing else: there is no
-- SELECT/UPDATE/DELETE policy for the anon role, so the list itself stays
-- private (read it from the dashboard or with the service-role key).

create table if not exists public.waitlist_signups (
  id         uuid primary key default gen_random_uuid(),
  email      text not null,
  source     text not null default 'landing',
  created_at timestamptz not null default now()
);

-- one row per address, case-insensitive (a repeat submit → 409, handled client-side)
create unique index if not exists waitlist_signups_email_lower_idx
  on public.waitlist_signups (lower(email));

alter table public.waitlist_signups enable row level security;

-- insert-only for the public (anon) role, with server-side email validation
drop policy if exists "waitlist anon insert" on public.waitlist_signups;
create policy "waitlist anon insert"
  on public.waitlist_signups
  for insert
  to anon
  with check (
    email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'
    and length(email) <= 320
    and source = 'landing'
  );
