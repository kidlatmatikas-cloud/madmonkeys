-- ============================================================
-- Guild War Log — Supabase schema
-- Run this once in your Supabase project's SQL Editor
-- (Project → SQL Editor → New query → paste → Run)
-- ============================================================

create extension if not exists pgcrypto;

-- ---------- Guild settings (single row per guild) ----------
create table guild_settings (
  id uuid primary key default gen_random_uuid(),
  name text not null default 'Your Guild',
  created_at timestamptz default now()
);

-- ---------- Full roster ----------
create table roster_members (
  id uuid primary key default gen_random_uuid(),
  guild_id uuid references guild_settings(id) on delete cascade,
  mmid text,
  name text not null,
  job text,
  created_at timestamptz default now(),
  unique (guild_id, name)
);

-- ---------- WoE / session records ----------
create table sessions (
  id uuid primary key default gen_random_uuid(),
  guild_id uuid references guild_settings(id) on delete cascade,
  event_name text not null default 'WoE',
  date date not null,
  opposing_guild text,
  role text,               -- 'Elite' | 'Sub'
  our_score int,
  opponent_score int,
  created_at timestamptz default now()
);

create table session_entries (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references sessions(id) on delete cascade,
  rank text,                -- 'MVP', '2', '3', ...
  name text not null,
  tablets int default 0,
  monsters int default 0,
  kills int default 0,
  assists int default 0,
  deaths int default 0,
  score int default 0
);

-- ---------- Party lineups ----------
-- `teams` mirrors the shape used in the app. Each slot stores {name, job}
-- together (not just a name) so the PUBLIC view page can render job icons
-- without needing read access to the private roster_members table —
-- only whoever is actually placed in this lineup is ever exposed.
-- [{ "name": "Elite Team", "parties": [{ "name": "Party 1", "slots": [{"name":"Alice","job":"High Priest"},{"name":"","job":""},...] }, ...] }, ...]
create table party_lineups (
  id uuid primary key default gen_random_uuid(),
  guild_id uuid references guild_settings(id) on delete cascade,
  name text not null default 'New Lineup',
  date date,
  map_name text,
  opposing_guild text,
  teams jsonb not null default '[]'::jsonb,
  share_slug text unique not null default encode(gen_random_bytes(6), 'hex'),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Keep updated_at fresh on every edit
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger party_lineups_updated_at
  before update on party_lineups
  for each row execute function set_updated_at();

-- ============================================================
-- Row Level Security
--
-- IMPORTANT: this project uses a simple ON-PAGE password box in
-- index.html instead of real Supabase logins. That means there's no
-- real "authenticated" session to check here — so these policies allow
-- the anon key (used by both index.html and view.html) to read/write
-- everything. In practice this means: anyone who has your Supabase URL
-- and anon key (visible in the page source) could write to your
-- database directly, bypassing the password box entirely. The password
-- box only stops casual visitors clicking around the UI — it is not a
-- real access barrier. Chosen deliberately for simplicity; see README.
-- ============================================================

alter table guild_settings enable row level security;
alter table roster_members enable row level security;
alter table sessions enable row level security;
alter table session_entries enable row level security;
alter table party_lineups enable row level security;

create policy "anon can manage guild_settings" on guild_settings
  for all using (true) with check (true);

create policy "anon can manage roster_members" on roster_members
  for all using (true) with check (true);

create policy "anon can manage sessions" on sessions
  for all using (true) with check (true);

create policy "anon can manage session_entries" on session_entries
  for all using (true) with check (true);

create policy "anon can manage party_lineups" on party_lineups
  for all using (true) with check (true);

-- ============================================================
-- Seed: one guild row to start with (edit the name however you like)
-- ============================================================
insert into guild_settings (name) values ('Your Guild');
