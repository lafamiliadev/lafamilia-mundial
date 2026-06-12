-- La Copa de LaFamilia — link bonus score-prediction matches to the football
-- provider so final scores can be sourced from the API (shadow-first: the admin
-- still confirms before points are awarded in Phase 1).
--
-- Additive + reversible: new nullable columns only. No change to scoring rules,
-- to existing scores, or to submitted predictions.

alter table score_matches
  -- The provider fixture id this match is linked to (e.g. API-Football's id),
  -- resolved once by the linker. null = not yet linked → admin-only.
  add column if not exists provider_fixture_id text,
  -- Provenance of the recorded final score: 'api' (admin confirmed the API
  -- value) or 'admin' (typed by hand). null until scored.
  add column if not exists scored_by text check (scored_by in ('api', 'admin')),
  -- When the final score was recorded.
  add column if not exists scored_at timestamptz;
