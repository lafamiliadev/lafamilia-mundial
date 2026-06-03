-- La Copa de LaFamilia — switch to the "Group Winners + Final Four" format.
-- Predictions now hold 12 group winners + 4 semifinalists + champion + tiebreaker.
-- Existing accounts (and referral attribution) are preserved; their picks reset
-- to the new format (champion carries over as a pre-fill) and scores are cleared.

-- 1) New prediction columns (old 6-pick columns are left in place, unused).
alter table predictions
  add column if not exists group_winners jsonb,
  add column if not exists semifinalists jsonb;

-- 2) Clear stale scores so the board starts fresh in the new format.
truncate table scores;

-- 3) Reset results to the new shape (champion + groupWinners + stageReached).
update results
set data = jsonb_build_object(
  'champion', null,
  'groupWinners', '{}'::jsonb,
  'stageReached', '{}'::jsonb
)
where id = 1;

-- 4) Upgrade settings: new scoring weights + groups cache (preserve lock time).
update settings
set config = jsonb_build_object(
  'weights', jsonb_build_object(
    'groupWinner', 3,
    'semifinalist', 10,
    'champion', 20,
    'groupSweepBonus', 10
  ),
  'lockTime', coalesce(config->>'lockTime', '2026-06-11T20:00:00Z'),
  'tournamentStage', coalesce(config->>'tournamentStage', 'pre'),
  'groups', coalesce(config->'groups', '{}'::jsonb),
  'groupsSyncedAt', config->'groupsSyncedAt'
)
where id = 1;

-- 5) Refresh the public view to expose the new fields (drops old pick columns).
--    Drop first: CREATE OR REPLACE can't remove/rename existing view columns.
drop view if exists public_entries;
create view public_entries as
  select p.id, p.name, p.rooting_country,
         pr.champion, pr.group_winners, pr.semifinalists
  from participants p
  left join predictions pr on pr.participant_id = p.id;
