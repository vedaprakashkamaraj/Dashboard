-- Run in Supabase SQL Editor. Safe to re-run.
create table if not exists public.admins (user_id uuid primary key references auth.users(id) on delete cascade);
alter table public.admins enable row level security;  -- no policies = nobody can read/write via API

-- Admin = in allow-list AND signed in with 2FA (aal2)
create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.admins where user_id = (select auth.uid()))
     and coalesce((select auth.jwt() ->> 'aal'), '') = 'aal2';
$$;
revoke all on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated;

create table if not exists public.messages (
  id bigint generated always as identity primary key,
  name text not null check (char_length(name) between 1 and 100),
  email text not null check (char_length(email) between 3 and 200),
  message text not null check (char_length(message) between 1 and 5000),
  is_read boolean not null default false,
  created_at timestamptz not null default now());
create table if not exists public.projects (
  id bigint generated always as identity primary key,
  title text not null check (char_length(title) between 1 and 120),
  description text check (char_length(description) <= 2000),
  tags text[] not null default '{}',
  url text check (url is null or url ~ '^https://'),
  sort int not null default 0,
  published boolean not null default true,
  created_at timestamptz not null default now());
create table if not exists public.skills (
  id bigint generated always as identity primary key,
  name text not null check (char_length(name) between 1 and 80),
  category text not null check (char_length(category) between 1 and 60),
  level int not null default 50 check (level between 0 and 100),
  sort int not null default 0,
  published boolean not null default true,
  created_at timestamptz not null default now());

alter table public.messages enable row level security;
alter table public.projects enable row level security;
alter table public.skills   enable row level security;

drop policy if exists "anon can send message" on public.messages;
drop policy if exists "admin manages messages" on public.messages;
create policy "anon can send message" on public.messages for insert to anon, authenticated
  with check (is_read = false);
create policy "admin manages messages" on public.messages for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists "public reads published projects" on public.projects;
drop policy if exists "admin manages projects" on public.projects;
create policy "public reads published projects" on public.projects for select to anon, authenticated using (published);
create policy "admin manages projects" on public.projects for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists "public reads published skills" on public.skills;
drop policy if exists "admin manages skills" on public.skills;
create policy "public reads published skills" on public.skills for select to anon, authenticated using (published);
create policy "admin manages skills" on public.skills for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- Then make yourself admin (replace email):
-- insert into public.admins (user_id) select id from auth.users where email = 'you@example.com';
