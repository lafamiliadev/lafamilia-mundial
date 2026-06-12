-- Fix: Jordan vs Argentina (JOR_ARG) had the wrong PT display time. Kickoff is
-- 2026-06-28 02:00:00Z = 10:00 p.m. ET / 7:00 p.m. PT (June 27). The seed copied
-- the ET time (10 p.m.) into the PT field. UTC kickoff + ET were already correct;
-- this only corrects the user-facing PT string.
update score_matches
set display_time_pt = 'June 27, 2026, 7:00 p.m. PT'
where match_id = 'JOR_ARG_2026_06_27' and display_time_pt = 'June 27, 2026, 10:00 p.m. PT';
