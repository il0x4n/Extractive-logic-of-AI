-- =====================================================================
--  Visitor notes — database setup for the "Extractive logic of AI" site
--  Run this once in your Supabase project:  SQL Editor → New query → Run
-- =====================================================================

-- 1. The table that stores the notes
create table if not exists public.notes (
  id          uuid        primary key default gen_random_uuid(),
  text        text        not null check (char_length(text) between 1 and 600),
  created_at  timestamptz not null default now()
);

-- 2. Turn on Row Level Security (nothing is reachable until a policy allows it)
alter table public.notes enable row level security;

-- 3. Anyone (the public "anon" key) may READ all notes
create policy "Public can read notes"
  on public.notes
  for select
  to anon
  using (true);

-- 4. Anyone may ADD a note (length is validated again at the database level)
create policy "Public can insert notes"
  on public.notes
  for insert
  to anon
  with check (char_length(text) between 1 and 600);

-- NOTE: there is deliberately NO update or delete policy for the public.
-- Visitors can write and read, but cannot edit or delete notes.
-- You (the owner) can always moderate/delete from the Supabase dashboard
-- under Table Editor → notes.
