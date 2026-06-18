-- Fix: two June 19 score matches were seeded with the wrong kickoff time.
-- Verified against the official FIFA/ESPN 2026 World Cup fixtures.
--
-- 1) Türkiye vs Paraguay — was 2026-06-19 04:00Z (showed June 18, 9 p.m. PT).
--    Actual kickoff is Fri June 19, 8:00 p.m. PT / 11:00 p.m. ET = 2026-06-20 03:00Z.
-- 2) Brazil vs Haiti — was 2026-06-20 01:00Z (9 p.m. ET). Actual kickoff is
--    Fri June 19, 5:30 p.m. PT / 8:30 p.m. ET = 2026-06-20 00:30Z.
--
-- Match IDs are unchanged, so existing predictions are preserved. Guarded on the
-- old value so re-running is a no-op.

update score_matches set
  kickoff_utc = '2026-06-20 03:00:00+00',
  display_time_pt = 'June 19, 2026, 8:00 p.m. PT',
  display_time_et = 'June 19, 2026, 11:00 p.m. ET'
where match_id = 'TUR_PAR_2026_06_19' and kickoff_utc = '2026-06-19 04:00:00+00';

update score_matches set
  kickoff_utc = '2026-06-20 00:30:00+00',
  display_time_pt = 'June 19, 2026, 5:30 p.m. PT',
  display_time_et = 'June 19, 2026, 8:30 p.m. ET'
where match_id = 'BRA_HAI_2026_06_19' and kickoff_utc = '2026-06-20 01:00:00+00';
