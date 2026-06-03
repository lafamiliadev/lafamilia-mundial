-- Race leaderboard: remember each entry's prior rank so the board can show
-- ▲/▼ movement between scoring runs.
alter table scores
  add column if not exists previous_rank int not null default 0;
