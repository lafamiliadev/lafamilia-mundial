# Live Picks — what the admin actually does during the tournament

Written for a non-technical, non-soccer admin. There are two ways to run it.

## Mode A — Automated (recommended): you do almost nothing

When the paid **API-Football** key is set in Vercel, a scheduled job runs on its
own once a day and:
- pulls the knockout matchups (who plays whom) as each round is drawn, so the
  pick cards appear automatically, and
- detects who advanced (including extra time / penalties) and scores it.

Your job shrinks to **spot-checking**: open the admin every day or two, glance at
the "Already scored" list, and confirm it looks right. ~**0–5 minutes total** for
the whole knockout stage. If you're traveling or busy, nothing breaks — the cron
keeps scoring without you.

### One-time setup (turns automation on)
1. In **Vercel → project → Settings → Environment Variables** (Production), add:
   - `FOOTBALL_API_PROVIDER` = `api-football`
   - `FOOTBALL_API_KEY` = your API-Football key
2. **Redeploy.**
3. Confirm it worked: open the admin → **API status** should read
   "API-Football OK — n/N requests today." Then click **Recalculate** — it will
   say how many knockout matchups it synced. (Before the knockout draw there are
   none yet; that's expected.)

> Note: scoring runs on a daily schedule, so a result can take up to ~24h to post
> automatically. You can always hit **Recalculate** in the admin to pull
> instantly, or confirm a match by hand (Mode B) — both update the board right away.

## Mode B — Manual (works with no key): foolproof, ~10 minutes total

If there's no API key, you confirm results by hand — but it's designed so you
never need to understand soccer.

### Once per round: set the matchups (who plays whom)
Admin → **Live Picks — set matchups** → pick the round → choose the two teams in
each game from the dropdowns → **Save**. This is the only part that needs the
bracket; if you're unsure who plays whom, the official fixtures are one search
away ("World Cup 2026 Round of 16 schedule"). ~2–3 minutes per round, 5 rounds.

### After each game: confirm who advanced
Admin → **Live Picks — confirm results**. For each game under "Needs your
confirmation":
1. Tap **Check the result →** (opens a search showing who won — in plain English).
2. Tap the team that **advanced** (e.g. "🇦🇷 Argentina advanced"). You can only
   tap one of the two teams in the match.
3. It shows you the impact first — *"This awards +4 points to 3 people"* — then
   tap **Yes, confirm**.

That's **3 taps, ~15–20 seconds per match.** The board updates instantly.

- **Already scored** games show a green ✓ with who advanced and the points given.
- Made a mistake? Tap **Change** — it warns you and re-scores cleanly.
- If no one picked a match, it tells you ("confirming won't change the
  leaderboard") so you don't sweat it.

### Total manual time
31 knockout matches × ~20 seconds ≈ **~10 minutes of confirmations**, spread
across ~3 weeks, plus ~10–15 minutes of one-time matchup setup. No match-watching
required — the "Check the result" link tells you who won.

## What if you forget, or you're away?
- **Mode A:** nothing to do — it scores automatically.
- **Mode B:** the only effect of a delay is that those games' points haven't
  landed yet. Players' picks are safe and locked; the moment you confirm, the
  points apply and the leaderboard catches up. Nothing is lost, and there's no
  deadline on confirming — you can do a week's worth in one sitting.

## What you never have to know
Tournament rules, penalties, aggregate scoring, or any soccer terminology. The
app only ever asks "who advanced?" and shows you where to check.
