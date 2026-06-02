-- LaFamilia Mundial 2026 — initial schema
-- Run in the Supabase SQL editor (or `supabase db push`) on a NEW, isolated
-- project named "lafamilia-mundial". All app access is server-side via the
-- service-role key; RLS denies anon by default (defense in depth).

create extension if not exists "pgcrypto";

-- ── Reference data ───────────────────────────────────────────────────
create table if not exists teams (
  code          text primary key,
  name          text not null,
  flag          text not null,
  confederation text not null,
  is_latam      boolean not null default false,
  fifa_seed     int not null default 4,
  qualified     boolean not null default false
);

create table if not exists players (
  id        text primary key,
  name      text not null,
  team_code text references teams(code)
);

-- ── Singleton config + results ───────────────────────────────────────
create table if not exists settings (
  id     int primary key default 1,
  config jsonb not null,
  constraint settings_singleton check (id = 1)
);

create table if not exists results (
  id   int primary key default 1,
  data jsonb not null,
  constraint results_singleton check (id = 1)
);

-- ── Participants + predictions ───────────────────────────────────────
create table if not exists participants (
  id              uuid primary key default gen_random_uuid(),
  name            text not null,
  email           text not null unique,
  rooting_country text references teams(code),
  resume_token    uuid not null unique default gen_random_uuid(),
  crew_code       text,
  created_at      timestamptz not null default now()
);

create table if not exists predictions (
  participant_id    uuid primary key references participants(id) on delete cascade,
  champion          text references teams(code),
  runner_up         text references teams(code),
  golden_boot       text,
  dark_horse        text references teams(code),
  latam_furthest    text references teams(code),
  final_total_goals int,
  submitted_at      timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

-- ── Scores + generated content ───────────────────────────────────────
create table if not exists scores (
  participant_id uuid primary key references participants(id) on delete cascade,
  base           int not null default 0,
  bonus          int not null default 0,
  total          int not null default 0,
  rank           int not null default 0,
  computed_at    timestamptz not null default now()
);

create table if not exists community_content (
  id         uuid primary key default gen_random_uuid(),
  type       text not null,
  title      text not null,
  body       text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_scores_total on scores (total desc);
create index if not exists idx_participants_resume_token on participants (resume_token);

-- ── Safe public views (no emails / tokens) ───────────────────────────
create or replace view leaderboard_view as
  select s.rank, p.name, p.rooting_country, s.total
  from participants p
  join scores s on s.participant_id = p.id
  order by s.total desc, p.name asc;

create or replace view public_entries as
  select p.id, p.name, p.rooting_country,
         pr.champion, pr.runner_up, pr.golden_boot,
         pr.dark_horse, pr.latam_furthest
  from participants p
  left join predictions pr on pr.participant_id = p.id;

-- ── Row Level Security ───────────────────────────────────────────────
-- Enable RLS everywhere and add NO anon policies. The app reads/writes with
-- the service-role key (which bypasses RLS); anon clients are fully denied,
-- so emails and tokens can never leak through PostgREST.
alter table participants       enable row level security;
alter table predictions        enable row level security;
alter table scores             enable row level security;
alter table results            enable row level security;
alter table settings           enable row level security;
alter table community_content  enable row level security;
alter table teams              enable row level security;
alter table players            enable row level security;

-- Reference data is harmless to read publicly (flags/names) — allow it.
create policy "teams readable"   on teams   for select using (true);
create policy "players readable" on players for select using (true);
