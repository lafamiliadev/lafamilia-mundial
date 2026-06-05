# Live Picks — Phase 2 (planned, not yet live)

> **Status:** Hidden behind `LIVE_PICKS_ENABLED` (`lib/flags.ts`, currently `false`).
> The **backbone is built**; the **playable feature is not**. Nothing here is deleted —
> flip the flag to `true` once the build below ships and every surface returns.
> This doc is the source of truth for the intended experience. Don't lose it.

---

## 1. What Live Picks is (the game)

A season-long competition layered on top of the locked bracket. During each
knockout round (Round of 32 → Final) members make **quick picks for each match —
"who wins this one?"** — one tap per match. Picks lock at kickoff and score after
results. One **High Conviction** pick per round doubles that match if correct.

**Why it matters:** the original bracket is locked from day one. Live Picks give a
*fresh* way to earn points every round, so people keep coming back and can climb
even if their champion is knocked out. It's the engagement engine for the
back half of the tournament.

**Points (already in `DEFAULT_WEIGHTS`):** R32 = 1, R16 = 2, QF = 4, SF = 8,
Final = 16 per correct pick. High Conviction doubles one pick per round. Feeds the
**Overall** leaderboard and a dedicated **Live Picks** ranking.

---

## 2. What already exists (reuse — don't rebuild)

| Piece | Where | State |
|---|---|---|
| Scoring engine (per-match, per-round weights, High Conviction) | `lib/scoring.ts` (`scorePredictions` live slice) | ✅ built + unit-tested |
| DB tables `live_picks`, `daily_picks` | migration `0006_live_picks.sql` (applied to prod) | ✅ |
| Repo methods (`get/save/listLivePicks`, daily) | `lib/db/{repo,supabase,memory}.ts` | ✅ |
| Types `LivePick {matchId, round, team, highConviction}`, `DailyPick` | `lib/types.ts` | ✅ |
| Leaderboard slicing (bracket/bonus/**live**) + Live view | `lib/services.ts`, `app/leaderboard/page.tsx` | ✅ |
| Round schedule (open/lock dates) + `pickStatus` | `lib/schedule.ts` (`LIVE_ROUNDS`) | ✅ |
| Email templates (round-open, closing-soon, score-update) | `lib/email-template.ts` | ✅ written |
| Reminder schedule + cron | `lib/reminders.ts`, `app/api/cron/reminders` | ✅ (round emails flag-gated off) |

## 3. What's missing (the actual build)

1. **Fixtures source** — per round, the list of matches with a stable `matchId`
   and the two teams in each.
2. **Matchup generation** — turn fixtures into pick cards for the open round.
3. **Pick UI** — a screen to choose a winner per match + set High Conviction.
4. **Save action** — a server action writing to `live_picks` (with the lock check).
5. **Results entry** — populate `results.matchWinners[matchId]` (admin + provider).
6. **Wiring** — cron scores live picks; leaderboard Live view goes live.
7. **La Jugada del Día** (optional, table exists) — one daily group-stage pick.

---

## 4. Build plan (scoped)

### 4.1 Fixtures source
- **Primary:** API-Football `/fixtures?league=1&season=2026` (already partially used
  in `lib/football/api-football.ts` for team lists/champion). Map each knockout
  fixture → `{ matchId, round, homeCode, awayCode, kickoffIso }` via `resolveTeamCode`.
- **Fallback / always-available:** admin paste of the round's matchups (a tiny admin
  form) so the feature never blocks on an API. **Decision needed:** API vs admin-first.
- Cache the round's fixtures in `settings` (like groups) so the UI is provider-independent.

### 4.2 Matchup generation
- On round open, read cached fixtures for that round; render one card per match.
- A match a member roots for / has in their bracket can be subtly highlighted (nice-to-have).

### 4.3 Pick UI (`/picks/live` or the `/picks` round-open slot)
- Round header: "Round of 32 · pick the winners · locks Sat 12pm ET" + a small
  "X of N picked" progress.
- Per match: two large flag buttons (home vs away), tap to choose. One tap = picked.
- **High Conviction:** a single ⚡ toggle per round; tapping it on a match moves it
  from any previous one (enforce one per round). Clear "2× if right" label.
- Sticky "Save my picks" (and you can edit until lock).
- Reuse the wizard's `PickGrid`/card styling for visual consistency.

### 4.4 Save action
- `saveLivePicks({ token, round, picks })` server action → validate (teams are in the
  matchups, exactly one High Conviction), reject if `now ≥ round.locksIso`
  (mirror the bracket lock), write `live_picks`, recompute.

### 4.5 High Conviction decision
- **Confirmed:** one per round, doubles that match. Keep it simple: a single ⚡ that
  can be moved, not a separate step. Show running "max points this round."

### 4.6 Results entry
- After each round: admin enters winners (and/or provider supplies them) →
  `results.matchWinners`. Surface a "results status / last updated" in admin so a
  frozen board is obvious. **This is the riskiest dependency** (same as the bracket).

### 4.7 Scoring
- Already done — `recomputeScores` passes each member's live picks to
  `scorePredictions`. Just ensure the cron runs often enough during knockout days
  (more than once/day for "you moved" immediacy).

### 4.8 Leaderboard updates
- Flip the Live view from the "coming later" card to the real ranked board.
- Movement (▲/▼) already supported; ensure it ticks after each round's scoring.

### 4.9 Emails / notifications (templates exist)
- Re-enable the round-open + closing-soon + score-update emails (flag gate).
- Each links to the live pick screen; closing-soon fires ~2h before lock; score-update
  fires after each round's scoring ("you moved up 8 — Round of 16 opens Saturday").

---

## 5. UX specification (the intended experience)

### When a round opens
A returning member sees, in order of priority: status bar "Round of 16 picks open ·
16 pts," home hero "Make my Live Picks → ," and an email. All land on the live
pick screen. Copy names the round in plain words ("the last 16 teams").

### How matchups are displayed
One card per match, two big flags + country names, a vs. divider, kickoff time.
No bracket diagram. A non-fan only needs "tap who you think wins."

### How users submit picks
One tap per match to choose a winner; the choice is obviously highlighted (same
selected-state as the bracket). "Save my picks" confirms. Editable until lock.

### How High Conviction works
A single ⚡ "Double down" per round. Tap it on the match you're most sure of; it
moves if you tap another. Label: "If you're right, this one's worth double."

### Confirmation states
After saving: "You're in for Round of 16 ✓ — N picks, ⚡ on [Team]. Locks Sat 12pm.
Edit anytime before then." After lock: "Locked. Results score Sunday."

### How scores are explained (ties into P1-4)
A per-round breakdown: "Round of 16: 5/8 right · ⚡ France ✓ (×2) · +14 pts." Never
just a bare number — every point is itemized so people trust it and non-fans learn.

### Leaderboard movement
After scoring: "You moved ▲8 to #6." The Live tab ranks live-only; Overall combines
everything. Show "X pts behind #5 — catchable."

### Notifications / emails
Round opens → "picks are open, locks [when]." ~2h before lock → "closing soon."
After scoring → "you moved, next round opens [when]." (All templates already exist.)

### Sharing
After a strong round, an optional share: "I went 7/8 in the Round of 16 🔥 — can you
beat my live picks?" Reuse the card/share infra; consider a per-round mini-card.

### Late joiners
Someone who joins mid-tournament can't make past-round picks (those are scored), but
can join the current open round immediately. Be explicit: "You missed earlier rounds,
but you're in for the Quarterfinals — pick away." No dead ends, no false guilt.

### Round-by-round evolution (R32 → Final)
- **R32:** 16 matches — emphasize speed ("3 minutes, tap your winners").
- **R16/QF:** fewer matches, higher stakes per pick (points rising) — lean into "worth more now."
- **SF:** 2 matches, big — "two calls, 8 pts each (×2 with conviction)."
- **Final:** 1 match — a focused, ceremonial single pick; pairs with the wrap-up.

### How prediction cards evolve
The collectible card can gain a "live record" line as rounds resolve
("Live Picks: 12/20 · #6 overall"), turning it into a living scorecard worth re-sharing.

### Staying understandable for non-fans
No jargon-first: always "the last 16 teams," "who wins this game," "tap your pick."
Knowledge helps but isn't required — it's "guess the winners," not analysis.

---

## 6. QA plan
- **Unit:** extend `scoring.test.ts` for multi-round live picks, High Conviction
  doubling, and the 3-slice tie-breaks (some exist already).
- **Preview-driven e2e:** use the preview clock (`lib/preview`) to open each round,
  make picks, lock, enter results, verify scoring + leaderboard movement + breakdown.
- **Edge cases:** late joiner, no-pick member, High-Conviction moved, lock boundary,
  provider-down → admin fallback, frozen board visibility.
- **Email QA:** the `/api/email-preview` harness already renders every template.

## 7. Risks
1. **Results pipeline** (highest) — getting accurate per-match winners in reliably.
   Mitigate with admin entry + a "last updated" indicator.
2. **Fixtures accuracy** — wrong matchups erode trust; cache + admin override.
3. **Scoring cadence** — daily cron is too coarse for "you moved" immediacy during
   knockout days; bump frequency.
4. **Scope creep** — La Jugada del Día is optional; ship Live Picks first.

## 8. Timeline (rough)
- **~Day 1–2:** fixtures source + admin matchup/results entry + caching.
- **~Day 2–3:** pick UI + save action + High Conviction + confirmation states.
- **~Day 3–4:** wire scoring/leaderboard live, re-enable emails, score breakdown.
- **~Day 4–5:** preview-driven QA across all rounds, polish, launch as "new this round."

Target: have it ready to flip on **before the Round of 32 (≈ June 28)** if pursuing
a same-tournament launch — otherwise a clean mid-tournament "new way to play" moment.
