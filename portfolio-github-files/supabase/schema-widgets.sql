-- Run AFTER schema.sql and schema-dashboard.sql. Safe to re-run. Admin-only (aal2); anon has NO access.
-- NEVER store passwords, API keys, SSH keys or tokens in these tables.
create table if not exists public.devices (
  id bigint generated always as identity primary key,
  name text not null check (char_length(name) between 1 and 80),
  room text check (char_length(room) <= 60),
  kind text not null default 'light' check (kind in ('light','fan','ac','plug','camera','lock','other')),
  is_on boolean not null default false,
  created_at timestamptz not null default now());
create table if not exists public.drive_storage (
  id bigint generated always as identity primary key,
  label text not null check (char_length(label) between 1 and 80),
  used_gb numeric not null default 0 check (used_gb >= 0),
  total_gb numeric not null default 15 check (total_gb > 0),
  updated_at timestamptz not null default now());
create table if not exists public.servers (
  id bigint generated always as identity primary key,
  name text not null check (char_length(name) between 1 and 80),
  host text check (char_length(host) <= 200),
  role text check (char_length(role) <= 80),
  os text check (char_length(os) <= 80),
  cpu_cores int check (cpu_cores between 0 and 1024),
  ram_gb numeric check (ram_gb >= 0),
  status text not null default 'online' check (status in ('online','offline','maintenance')),
  notes text check (char_length(notes) <= 2000),
  created_at timestamptz not null default now());
do $$ declare t text; begin
  foreach t in array array['devices','drive_storage','servers'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists "admin only" on public.%I', t);
    execute format('create policy "admin only" on public.%I for all to authenticated using (public.is_admin()) with check (public.is_admin())', t);
  end loop; end $$;
