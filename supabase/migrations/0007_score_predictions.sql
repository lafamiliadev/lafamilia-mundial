-- La Copa de LaFamilia — Bonus score predictions for eligible World Cup matches.
-- Members predict the exact scoreline of select LatAm + Spain matches and earn
-- bonus points: +3 for an exact score, +1 for the correct result only.
-- This is not betting. No money, no odds, no gambling language.

-- 1) Eligible matches (source of truth).
create table if not exists score_matches (
  match_id         text primary key,
  team_a           text not null,
  team_b           text not null,
  eligible_team    text not null,    -- which team makes this eligible
  kickoff_utc      timestamptz not null,
  display_time_et  text not null,
  display_time_pt  text not null,
  -- Set by admin after the match. Triggers point calculation.
  final_score_a    int,
  final_score_b    int,
  created_at       timestamptz not null default now()
);

-- 2) One score prediction per participant per match.
create table if not exists score_predictions (
  id             uuid primary key default gen_random_uuid(),
  participant_id uuid not null references participants(id) on delete cascade,
  match_id       text not null references score_matches(match_id),
  score_a        int not null check (score_a >= 0 and score_a <= 30),
  score_b        int not null check (score_b >= 0 and score_b <= 30),
  -- null = not yet scored; 0 / 1 / 3 = points awarded.
  -- Idempotent: only ever set once. Admin must reset to null to re-score.
  points_awarded int,
  submitted_at   timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  constraint uq_participant_match unique (participant_id, match_id)
);

-- 3) Email send log — prevents duplicate announcement emails per user per template.
create table if not exists score_email_log (
  id             uuid primary key default gen_random_uuid(),
  participant_id uuid not null references participants(id) on delete cascade,
  template_id    text not null,
  sent_at        timestamptz not null default now(),
  status         text not null default 'sent',
  constraint uq_score_email unique (participant_id, template_id)
);

-- 4) RLS (service-role only — anon has no access, same as all other tables).
alter table score_matches     enable row level security;
alter table score_predictions enable row level security;
alter table score_email_log   enable row level security;

-- 5) Seed eligible group-stage matches.
insert into score_matches (match_id, team_a, team_b, eligible_team, kickoff_utc, display_time_et, display_time_pt) values
  ('MEX_RSA_2026_06_11', 'Mexico',       'South Africa', 'Mexico',          '2026-06-11T19:00:00Z', 'June 11, 2026, 3:00 p.m. ET',   'June 11, 2026, 12:00 p.m. PT'),
  ('USA_PAR_2026_06_12', 'USA',          'Paraguay',     'Paraguay',        '2026-06-13T01:00:00Z', 'June 12, 2026, 9:00 p.m. ET',   'June 12, 2026, 6:00 p.m. PT'),
  ('BRA_MAR_2026_06_13', 'Brazil',       'Morocco',      'Brazil',          '2026-06-13T22:00:00Z', 'June 13, 2026, 6:00 p.m. ET',   'June 13, 2026, 3:00 p.m. PT'),
  ('HAI_SCO_2026_06_13', 'Haiti',        'Scotland',     'Haiti',           '2026-06-14T01:00:00Z', 'June 13, 2026, 9:00 p.m. ET',   'June 13, 2026, 6:00 p.m. PT'),
  ('CIV_ECU_2026_06_14', 'Ivory Coast',  'Ecuador',      'Ecuador',         '2026-06-14T23:00:00Z', 'June 14, 2026, 7:00 p.m. ET',   'June 14, 2026, 4:00 p.m. PT'),
  ('ESP_CPV_2026_06_15', 'Spain',        'Cape Verde',   'Spain',           '2026-06-15T16:00:00Z', 'June 15, 2026, 12:00 p.m. ET',  'June 15, 2026, 9:00 a.m. PT'),
  ('KSA_URU_2026_06_15', 'Saudi Arabia', 'Uruguay',      'Uruguay',         '2026-06-15T22:00:00Z', 'June 15, 2026, 6:00 p.m. ET',   'June 15, 2026, 3:00 p.m. PT'),
  ('ARG_ALG_2026_06_16', 'Argentina',    'Algeria',      'Argentina',       '2026-06-17T01:00:00Z', 'June 16, 2026, 9:00 p.m. ET',   'June 16, 2026, 6:00 p.m. PT'),
  ('GHA_PAN_2026_06_17', 'Ghana',        'Panama',       'Panama',          '2026-06-17T23:00:00Z', 'June 17, 2026, 7:00 p.m. ET',   'June 17, 2026, 4:00 p.m. PT'),
  ('UZB_COL_2026_06_17', 'Uzbekistan',   'Colombia',     'Colombia',        '2026-06-18T02:00:00Z', 'June 17, 2026, 10:00 p.m. ET',  'June 17, 2026, 7:00 p.m. PT'),
  ('MEX_KOR_2026_06_18', 'Mexico',       'South Korea',  'Mexico',          '2026-06-19T01:00:00Z', 'June 18, 2026, 9:00 p.m. ET',   'June 18, 2026, 6:00 p.m. PT'),
  ('TUR_PAR_2026_06_19', 'Türkiye',      'Paraguay',     'Paraguay',        '2026-06-19T04:00:00Z', 'June 19, 2026, 12:00 a.m. ET',  'June 18, 2026, 9:00 p.m. PT'),
  ('BRA_HAI_2026_06_19', 'Brazil',       'Haiti',        'Brazil, Haiti',   '2026-06-20T01:00:00Z', 'June 19, 2026, 9:00 p.m. ET',   'June 19, 2026, 6:00 p.m. PT'),
  ('ECU_CUR_2026_06_20', 'Ecuador',      'Curaçao',      'Ecuador',         '2026-06-21T00:00:00Z', 'June 20, 2026, 8:00 p.m. ET',   'June 20, 2026, 5:00 p.m. PT'),
  ('ESP_KSA_2026_06_21', 'Spain',        'Saudi Arabia', 'Spain',           '2026-06-21T16:00:00Z', 'June 21, 2026, 12:00 p.m. ET',  'June 21, 2026, 9:00 a.m. PT'),
  ('URU_CPV_2026_06_21', 'Uruguay',      'Cape Verde',   'Uruguay',         '2026-06-21T22:00:00Z', 'June 21, 2026, 6:00 p.m. ET',   'June 21, 2026, 3:00 p.m. PT'),
  ('ARG_AUT_2026_06_22', 'Argentina',    'Austria',      'Argentina',       '2026-06-22T17:00:00Z', 'June 22, 2026, 1:00 p.m. ET',   'June 22, 2026, 10:00 a.m. PT'),
  ('PAN_CRO_2026_06_23', 'Panama',       'Croatia',      'Panama',          '2026-06-23T23:00:00Z', 'June 23, 2026, 7:00 p.m. ET',   'June 23, 2026, 4:00 p.m. PT'),
  ('COL_COD_2026_06_23', 'Colombia',     'Congo DR',     'Colombia',        '2026-06-24T02:00:00Z', 'June 23, 2026, 10:00 p.m. ET',  'June 23, 2026, 7:00 p.m. PT'),
  ('BRA_SCO_2026_06_24', 'Brazil',       'Scotland',     'Brazil',          '2026-06-24T22:00:00Z', 'June 24, 2026, 6:00 p.m. ET',   'June 24, 2026, 3:00 p.m. PT'),
  ('MAR_HAI_2026_06_24', 'Morocco',      'Haiti',        'Haiti',           '2026-06-24T22:00:00Z', 'June 24, 2026, 6:00 p.m. ET',   'June 24, 2026, 3:00 p.m. PT'),
  ('MEX_CZE_2026_06_24', 'Mexico',       'Czechia',      'Mexico',          '2026-06-25T01:00:00Z', 'June 24, 2026, 9:00 p.m. ET',   'June 24, 2026, 6:00 p.m. PT'),
  ('ECU_GER_2026_06_25', 'Ecuador',      'Germany',      'Ecuador',         '2026-06-25T20:00:00Z', 'June 25, 2026, 4:00 p.m. ET',   'June 25, 2026, 1:00 p.m. PT'),
  ('PAR_AUS_2026_06_25', 'Paraguay',     'Australia',    'Paraguay',        '2026-06-26T02:00:00Z', 'June 25, 2026, 10:00 p.m. ET',  'June 25, 2026, 7:00 p.m. PT'),
  ('URU_ESP_2026_06_26', 'Uruguay',      'Spain',        'Uruguay, Spain',  '2026-06-27T00:00:00Z', 'June 26, 2026, 8:00 p.m. ET',   'June 26, 2026, 5:00 p.m. PT'),
  ('PAN_ENG_2026_06_27', 'Panama',       'England',      'Panama',          '2026-06-27T21:00:00Z', 'June 27, 2026, 5:00 p.m. ET',   'June 27, 2026, 2:00 p.m. PT'),
  ('COL_POR_2026_06_27', 'Colombia',     'Portugal',     'Colombia',        '2026-06-27T23:30:00Z', 'June 27, 2026, 7:30 p.m. ET',   'June 27, 2026, 4:30 p.m. PT'),
  ('JOR_ARG_2026_06_27', 'Jordan',       'Argentina',    'Argentina',       '2026-06-28T02:00:00Z', 'June 27, 2026, 10:00 p.m. ET',  'June 27, 2026, 7:00 p.m. PT')
on conflict (match_id) do nothing;
