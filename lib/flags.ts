// ── Feature flags ─────────────────────────────────────────────────────
//
// LIVE_PICKS_ENABLED is the master switch for the season-long Live Picks
// competition (the knockout-round "pick each match's winner" game, plus the
// per-round reminder emails and the Live leaderboard tab).
//
// ON: the full Live Picks experience is live for players. Before the knockout
// rounds open (R32 ~Jun 28) every surface shows a calm "coming next / opens at
// the knockouts" state; once a round opens, members pick winners per match.
// Results auto-score from API-Football (daily + hourly cron). Set to `false` to
// instantly hide every Live Picks surface again. See docs/live-picks-operations.md.
export const LIVE_PICKS_ENABLED = true;
