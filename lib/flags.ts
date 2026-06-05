// ── Feature flags ─────────────────────────────────────────────────────
//
// LIVE_PICKS_ENABLED is the master switch for the season-long Live Picks
// competition (the knockout-round "pick each match's winner" game, plus the
// per-round reminder emails and the Live leaderboard tab).
//
// It is FALSE for launch because the playable feature isn't built yet — only the
// backbone is (scoring engine, DB tables `live_picks`/`daily_picks`, repo
// methods, leaderboard slicing, schedule, email templates). Nothing is deleted:
// every user-facing Live Picks surface checks this flag so it stays hidden until
// the feature can actually save picks. Flip this to `true` when Phase 2 ships and
// the whole experience returns. See docs/live-picks-phase2.md for the build plan.
export const LIVE_PICKS_ENABLED = false;
