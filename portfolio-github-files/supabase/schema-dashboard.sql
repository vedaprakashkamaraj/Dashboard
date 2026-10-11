-- Run AFTER schema.sql. Safe to re-run. Personal data: admin-only (aal2), anon has NO access.
create table if not exists public.tasks (
  id bigint generated always as identity primary key,
  title text not null check (char_length(title) between 1 and 200),
  priority text not null default 'medium' check (priority in ('low','medium','high')),
  due date, done boolean not null default false,
  created_at timestamptz not null default now());
create table if not exists public.notes (
  id bigint generated always as identity primary key,
  title text not null check (char_length(title) between 1 and 120),
  body text check (char_length(body) <= 10000),
  created_at timestamptz not null default now());
create table if not exists public.progress (
  topic text primary key check (topic in ('linux','networking','cloud','devops','cybersecurity')),
  percent int not null default 0 check (percent between 0 and 100),
  updated_at timestamptz not null default now());

do $$ declare t text; begin
  foreach t in array array['tasks','notes','progress'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists "admin only" on public.%I', t);
    execute format('create policy "admin only" on public.%I for all to authenticated using (public.is_admin()) with check (public.is_admin())', t);
  end loop; end $$;
