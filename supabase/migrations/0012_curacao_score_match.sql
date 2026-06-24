-- La Copa de LaFamilia — add Curaçao's final Group E match as a bonus
-- score-prediction game. Curaçao (Caribbean / CONCACAF) is embraced as part of
-- the Latine community here, same as Haiti already is in this feature.
--
-- Curaçao vs Ivory Coast — Group E final round, kicks off simultaneously with
-- Ecuador vs Germany (ECU_GER_2026_06_25) at 2026-06-25 20:00Z = 4:00 p.m. ET /
-- 1:00 p.m. PT. Eligible via Curaçao. Verified against the official 2026 World
-- Cup Group E schedule. provider_fixture_id left null → admin confirms the final
-- score (same as any unlinked match). Guarded so re-running is a no-op.
insert into score_matches (match_id, team_a, team_b, eligible_team, kickoff_utc, display_time_et, display_time_pt) values
  ('CUR_CIV_2026_06_25', 'Curaçao', 'Ivory Coast', 'Curaçao', '2026-06-25T20:00:00Z', 'June 25, 2026, 4:00 p.m. ET', 'June 25, 2026, 1:00 p.m. PT')
on conflict (match_id) do nothing;
