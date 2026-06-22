-- EFL Tournament Supabase setup
-- Run this in: Supabase Dashboard → SQL Editor → New query → Run

create table if not exists public.efl_data (
  key text primary key check (key in ('settings', 'teams', 'matches')),
  value jsonb not null,
  updated_at timestamptz not null default now()
);

-- Realtime: allow Supabase Realtime to listen to this table.
do $$
begin
  alter publication supabase_realtime add table public.efl_data;
exception
  when duplicate_object then null;
end $$;

-- Enable Row Level Security.
alter table public.efl_data enable row level security;

-- Remove old demo policies if you rerun this file.
drop policy if exists "EFL public read" on public.efl_data;
drop policy if exists "EFL public insert" on public.efl_data;
drop policy if exists "EFL public update" on public.efl_data;

-- Demo policies: public read/write for the tournament website.
-- This is simple for testing, but not strong admin security.
create policy "EFL public read"
on public.efl_data
for select
to anon
using (true);

create policy "EFL public insert"
on public.efl_data
for insert
to anon
with check (key in ('settings', 'teams', 'matches'));

create policy "EFL public update"
on public.efl_data
for update
to anon
using (key in ('settings', 'teams', 'matches'))
with check (key in ('settings', 'teams', 'matches'));

grant usage on schema public to anon;
grant select, insert, update on public.efl_data to anon;

-- Seed default website data. Existing rows will not be overwritten.
insert into public.efl_data (key, value) values
(
  'settings',
  '{"tournamentName":"Elite Football League","teamLimit":48,"groupCount":8,"qualifyPerGroup":2,"teamsPerGroup":4,"adminPin":""}'::jsonb
),
(
  'teams',
  '[{"id":1,"name":"Team A","group":"A"},{"id":2,"name":"Team B","group":"A"},{"id":3,"name":"Team C","group":"A"},{"id":4,"name":"Team D","group":"A"},{"id":5,"name":"Team E","group":"B"},{"id":6,"name":"Team F","group":"B"},{"id":7,"name":"Team G","group":"B"},{"id":8,"name":"Team H","group":"B"}]'::jsonb
),
(
  'matches',
  '[{"id":1,"round":"Group Stage","group":"A","home":"Team A","away":"Team B","homeScore":"","awayScore":"","date":"2026-06-10","time":"16:00"},{"id":2,"round":"Group Stage","group":"A","home":"Team C","away":"Team D","homeScore":"","awayScore":"","date":"2026-06-10","time":"18:00"},{"id":3,"round":"Group Stage","group":"B","home":"Team E","away":"Team F","homeScore":"","awayScore":"","date":"2026-06-11","time":"16:00"},{"id":4,"round":"Group Stage","group":"B","home":"Team G","away":"Team H","homeScore":"","awayScore":"","date":"2026-06-11","time":"18:00"}]'::jsonb
)
on conflict (key) do nothing;


-- Optional upgrade for existing Supabase projects:
-- If your settings row already existed before this version, this adds tournamentName without deleting your teams or matches.
update public.efl_data
set value = jsonb_set(value, '{tournamentName}', to_jsonb(coalesce(value->>'tournamentName', 'Elite Football League')), true),
    updated_at = now()
where key = 'settings';


-- Optional security upgrade:
-- Run this only if you want to remove the old default PIN from an existing project.
-- After running it, open /admin.html and create a new private admin PIN.
update public.efl_data
set value = jsonb_set(value, '{adminPin}', '""'::jsonb, true),
    updated_at = now()
where key = 'settings'
  and value->>'adminPin' = '1234';
