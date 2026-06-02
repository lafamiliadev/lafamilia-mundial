# LaFamilia Mundial 2026 ⚽🌎

A community **prediction game** for the FIFA World Cup 2026 — built for the LaFamilia ecosystem of founders, investors, operators, and friends.

> Predict the tournament. Compete with the community. See who becomes LaFamilia's top predictor.

**Not betting. Not fantasy.** Just bragging rights, community insights, and shareable WhatsApp content. A full prediction takes **under 90 seconds** on a phone.

---

## ✨ What it does

- **7-pick wizard** (`/play`) — champion, runner-up, Golden Boot, dark horse, LatAm-furthest team, rooting country, plus a goals-in-the-final tiebreaker. Big flag cards, search, one decision per screen.
- **Passwordless magic resume link** — every entry gets a private `/r/<token>` URL to return and edit before kickoff. No accounts, no passwords.
- **Instant share card** — a personalized OG image (`/api/og/<token>`) renders the WhatsApp preview that drives the viral loop.
- **Live leaderboard** (`/leaderboard`) — Top 10, your rank, total participants. Points grow as the tournament unfolds.
- **Community insights** (`/insights`) — auto-generated stats: who Familia roots for, most-predicted champion, popular dark horse, Golden Boot, LatAm belief.
- **Admin control room** (`/admin`) — participants, edit links, CSV export, manual recalculation, API status, and a one-tap **WhatsApp update generator**.
- **Fully automated scoring** — a Vercel Cron job pulls results from a football API and recomputes every score; admins can override any result.

---

## 🧱 Tech stack

| Layer | Choice |
| --- | --- |
| Framework | Next.js 16 (App Router, Server Actions, Turbopack) |
| Language | TypeScript (strict) |
| Styling | Tailwind CSS v4 |
| Data | Supabase (Postgres) — with a zero-config in-memory dev store |
| Football data | API-Football (live) or OpenFootball (free) behind one interface |
| Share cards | `next/og` |
| Scheduling | Vercel Cron |
| Email (optional) | Resend |

---

## 🚀 Quick start (zero config)

No keys required for local development — the app falls back to an in-memory store and the free OpenFootball provider.

```bash
npm install
npm run dev          # http://localhost:3000
```

Then:

- Visit `/play` to make a prediction.
- Visit `/leaderboard` and `/insights`.
- Visit `/admin` (default password: `lafamilia-admin`) to score and generate updates.

```bash
npm test             # scoring-engine unit tests
npm run build        # production build (strict TS)
npm run db:seed:gen  # regenerate supabase/seed.sql from lib/teams.ts + lib/players.ts
```

> The dev store persists to `.data/dev.json` (git-ignored). Delete it to reset.

---

## 🔐 Environment variables

Copy `.env.example` → `.env.local`. Everything is optional locally; set it all for production.

| Variable | Required in prod | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_APP_URL` | ✅ | Base URL for share links + OG cards |
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ | Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ | Server-only; all reads/writes use this |
| `FOOTBALL_API_PROVIDER` | ✅ | `api-football` or `openfootball` |
| `FOOTBALL_API_KEY` | for api-football | api-sports.io key |
| `ADMIN_PASSWORD` | ✅ | Admin login + cookie signing secret |
| `CRON_SECRET` | ✅ | Protects `/api/cron/score` |
| `RESEND_API_KEY` | optional | Email delivery |
| `EMAIL_FROM` | optional | From address |

Env vars are validated with zod at boot (`lib/env.ts`) — a misconfigured deploy fails loudly.

---

## 🗄️ Supabase setup (production)

1. Create a **new, isolated** Supabase project named `lafamilia-mundial` (do **not** reuse any existing LaFamilia database).
2. In the SQL editor, run:
   - `supabase/migrations/0001_init.sql` (schema, RLS, views)
   - `supabase/seed.sql` (teams, players, default settings)
3. Copy the project URL + anon key + service-role key into your env vars.

**Security model:** RLS is enabled on every table with **no anon policies**. The app reads/writes exclusively server-side with the service-role key, so emails and resume tokens can never leak through the public API. Reference data (teams/players) is the only publicly readable data.

---

## ▲ Deploy to Vercel

1. Push this repo to a **new** GitHub repo (`lafamilia-mundial`).
2. Import it as a **new** Vercel project (`lafamilia-mundial`) — separate from any existing deployment.
3. Add the env vars above (Production + Preview).
4. `vercel.json` already registers the scoring cron (`/api/cron/score`, every 3 hours). Vercel automatically sends the `Authorization: Bearer $CRON_SECRET` header when `CRON_SECRET` is set.
5. Deploy. Set `NEXT_PUBLIC_APP_URL` to your production domain.

See [`docs/OPERATIONS.md`](docs/OPERATIONS.md) for running the game day-to-day and [`docs/MAINTENANCE.md`](docs/MAINTENANCE.md) for costs, scaling, and backups.

---

## 📐 Scoring

Configurable in `settings` (defaults shown):

| Pick | Points |
| --- | --- |
| Champion | 25 |
| Runner-up | 15 |
| Golden Boot | 15 |
| Dark horse | 10 |
| LatAm furthest | 15 |
| **Progressive bonus** (champion pick) | R16 +5 · QF +5 · SF +10 · Final +10 · Champion +25 |

**Dark horse** scores only for genuine outsiders (FIFA seed ≥ configurable threshold) that reach the configured stage — or any team the admin explicitly designates. Ties break on the goals-in-the-final prediction. The engine is a pure function in [`lib/scoring.ts`](lib/scoring.ts) with full unit tests.

---

## 🗂️ Project structure

```
app/
  page.tsx              Hero + countdown + social proof
  play/                 Prediction wizard
  done/                 Confirmation + share card
  r/[token]/            Resume & edit (magic link)
  leaderboard/  insights/
  admin/                Control room (+ login)
  api/cron/score/       Automated scoring (cron)
  api/og/[token]/       Share image
  api/admin/export/     CSV export
  actions/              Server actions (predictions, admin)
components/             Wizard, PickGrid, Countdown, UI kit, admin widgets
lib/
  scoring.ts            Pure scoring engine (+ scoring.test.ts)
  services.ts           Recompute + leaderboard
  insights.ts community.ts
  football/             Provider abstraction (api-football, openfootball)
  db/                   Repo interface + memory + supabase
  teams.ts players.ts env.ts admin-auth.ts types.ts
supabase/               migrations + generated seed
proxy.ts                Admin route guard (Next 16 proxy)
```

---

Built for the Familia. ⚽🌎 _Not betting — just bragging rights._
