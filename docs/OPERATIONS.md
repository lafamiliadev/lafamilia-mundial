# Operations guide — running LaFamilia Mundial 2026

Everything an admin needs to run the game during the tournament. All admin tools live at **`/admin`** (log in with `ADMIN_PASSWORD`).

---

## How scores update

**Automatically.** A Vercel Cron job calls `/api/cron/score` every 3 hours. Each run:

1. Pulls the latest results from the active football provider (`FOOTBALL_API_PROVIDER`).
2. Merges any admin overrides on top (admin always wins).
3. Recomputes every participant's score and re-ranks the leaderboard.

**Manually.** In `/admin`, click **↻ Recalculate scores** to run the same job on demand (e.g. right after a big match).

> Cadence is set in `vercel.json` (`"schedule": "0 */3 * * *"`). Tighten it to hourly during knockout rounds if you like.

---

## How to update / override tournament data

Go to **`/admin` → Tournament results**. You can set, per field:

- **Champion / Runner-up / LatAm furthest** — team codes (e.g. `BRA`, `ARG`).
- **Golden Boot** — the player id (e.g. `messi`) from `lib/players.ts`.
- **Dark horse override** — force a specific team to count as the dark horse.
- **Teams reaching each stage** — comma-separated team codes for `r16`, `qf`, `sf`, `final`, `champion`. This drives the progressive bonus points.

Click **Save results & rescore** — every score recomputes immediately. Use this to correct anything the API gets wrong, or to run the game fully by hand (set `FOOTBALL_API_PROVIDER=openfootball` and just edit results).

**Team codes** are the 3-letter codes in `lib/teams.ts` (ARG, BRA, MEX, FRA, …).

### When qualification completes

The LatAm step and team lists already include the full CONMEBOL/CONCACAF field. As real qualification finalizes, flip `qualified` in `lib/teams.ts` (and re-run `npm run db:seed:gen`, then re-apply `supabase/seed.sql`) so only qualified teams surface as "qualified-first."

---

## How to export participants

In **`/admin` → API status**:

- **⬇ Export participants CSV** — name, email, every pick, total points, signup time.
- **⬇ Export leaderboard CSV** — rank, name, rooting country, total points.

Both are admin-only (`/api/admin/export?kind=participants|leaderboard`) and download instantly.

---

## How to generate WhatsApp updates

In **`/admin` → WhatsApp update generator**, click **✨ Generate WhatsApp updates**. It builds ready-to-paste posts from live data:

- 🏆 **New Leader** — who's in first.
- 🌎 **Community Favorite** — most-predicted champion + %.
- 🔥 **Dark Horse Watch** — most popular surprise pick.
- 🌶️ **LatAm Belief** — top LatAm pick.
- 📈 **Familia is growing** — participation milestone.

Each card has a **Copy** button — paste straight into WhatsApp, a newsletter, or social. Re-generate any time for fresh numbers (e.g. weekly).

---

## Editing a participant's predictions

Every participant row in `/admin` has an **open** link to their private `/r/<token>` page, where you (or they) can edit any pick before kickoff. Changes rescore automatically.

---

## Pre-kickoff checklist

- [ ] `NEXT_PUBLIC_APP_URL` set to the production domain (so share links/OG cards are correct).
- [ ] `ADMIN_PASSWORD` and `CRON_SECRET` changed from defaults.
- [ ] `settings.lockTime` matches the opening match (default `2026-06-11T20:00:00Z`).
- [ ] Football provider chosen and (if `api-football`) `FOOTBALL_API_KEY` set; check **API status** shows healthy.
- [ ] Share the homepage link in WhatsApp. Done.
