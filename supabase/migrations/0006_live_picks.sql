-- La Copa de LaFamilia — add the season-long "Live Picks" competition layer.
-- The original 3-minute bracket is unchanged. This adds:
--   • Bonus Picks (Golden Ball/Boot/Glove + Dark Horse) on the predictions row
--   • Per-competition score slices (bracket / bonus / live) so the leaderboard
--     can rank three views independently
--   • Live Knockout Picks + La Jugada del Día stores (Phase 2 UI, built now)

-- 1) Bonus Picks ride along with the bracket on the predictions table.
alter table predictions
  add column if not exists bonus jsonb;

-- 2) Split the persisted score into per-competition slices. Old installs have
--    `base`/`bonus` int columns from 0001; rename/repurpose into the 3-slice
--    model (bracket_points / bonus_points / live_points). `total` stays.
alter table scores
  add column if not exists bracket_points int not null default 0,
  add column if not exists bonus_points   int not null default 0,
  add column if not exists live_points    int not null default 0;

-- Carry any legacy values forward, then drop the old columns if present.
update scores set bracket_points = base where bracket_points = 0 and base is not null;
alter table scores drop column if exists base;
-- The old generic `bonus` int is replaced by bonus_points; drop if it exists as int.
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_name = 'scores' and column_name = 'bonus'
      and data_type in ('integer', 'bigint', 'smallint')
  ) then
    update scores set bonus_points = bonus where bonus_points = 0;
    alter table scores drop column bonus;
  end if;
end $$;

-- 3) Live Knockout Picks: one row per participant holding all their round picks
--    as a jsonb array ({ matchId, round, team, highConviction }).
create table if not exists live_picks (
  participant_id uuid primary key references participants(id) on delete cascade,
  picks          jsonb not null default '[]'::jsonb,
  updated_at     timestamptz not null default now()
);

-- 4) La Jugada del Día: one row per participant holding all daily picks
--    as a jsonb array ({ day, matchId, pick }).
create table if not exists daily_picks (
  participant_id uuid primary key references participants(id) on delete cascade,
  picks          jsonb not null default '[]'::jsonb,
  updated_at     timestamptz not null default now()
);

-- 5) RLS on (service-role only, like every other table — no anon policies).
alter table live_picks  enable row level security;
alter table daily_picks enable row level security;
