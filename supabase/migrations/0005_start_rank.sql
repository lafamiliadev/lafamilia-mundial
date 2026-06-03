-- Highest Climber award (El Escalador): remember each entry's rank at the first
-- scored run (group-stage end) so we can measure the full-tournament climb.
alter table scores
  add column if not exists start_rank int not null default 0;
