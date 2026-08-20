-- ============================================================
-- Run this in Supabase → SQL Editor to add the new "mark yourself
-- absent" feature to an EXISTING project (one that already has
-- guild_settings, roster_members, sessions, session_entries,
-- party_lineups from before). Safe to run once — creates one new
-- table and nothing else.
-- ============================================================

create table if not exists absences (
  id uuid primary key default gen_random_uuid(),
  guild_id uuid references guild_settings(id) on delete cascade,
  lineup_id uuid references party_lineups(id) on delete cascade,
  member_name text not null,
  absent_date date not null,
  created_at timestamptz default now()
);

alter table absences enable row level security;

create policy "anon can manage absences" on absences
  for all using (true) with check (true);
