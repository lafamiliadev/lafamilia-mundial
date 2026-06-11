-- La Copa de LaFamilia — separate score_pick_points column on scores table.
-- Score prediction bonus points are kept separate from the existing bracket /
-- bonus-picks / live-pick slices so the breakdown is unambiguous.

alter table scores
  add column if not exists score_pick_points int not null default 0;
