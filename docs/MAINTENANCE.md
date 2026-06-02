# Maintenance — cost, scaling, backups

## Monthly cost estimate

Built to run a single-tournament community game for **$0–65/month**.

| Service | Tier | Cost | Notes |
| --- | --- | --- | --- |
| **Vercel** | Hobby | **$0** | Fine for a community game. Pro ($20/mo) only if you want team seats, more cron, or higher limits. |
| **Supabase** | Free | **$0** | 500 MB DB, 50k MAU — comfortably covers thousands of participants. Pro ($25/mo) for daily backups + no project pausing. |
| **Football API** | see below | **$0–39** | OpenFootball is free; API-Football paid tier ~$25–39/mo. |
| **Resend** (optional) | Free | **$0** | 3k emails/mo free; only if you enable email. |
| **Domain** | — | ~$1/mo | If you use a custom subdomain like `mundial.vcfamilia.com`. |

**Realistic total:** **$0** (free tiers + OpenFootball) to **~$65/mo** (Vercel Pro + Supabase Pro + API-Football). For one World Cup, **$0–39/mo** is typical.

### API cost detail

| Provider | Cost | When to use |
| --- | --- | --- |
| **OpenFootball** | Free, no key | Default. Public-domain JSON. Great for launch + fallback. |
| **API-Football** (api-sports.io) | Free tier 100 req/day; paid ~$25–39/mo | When you want live, automated results. Cron caches, so even the free tier can suffice for a single tournament. |

Because the cron runs every 3 hours, automated polling is ~8 requests/day — well within free limits. Swapping providers is a one-line env change (`FOOTBALL_API_PROVIDER`).

---

## Scaling considerations

- **Reads** dominate (leaderboard, insights). They're computed server-side from a single participant list — for thousands of entries this is trivially fast. If you reach tens of thousands, add Postgres indexes (already included on `scores.total` and `participants.resume_token`) and consider caching the leaderboard with `revalidateTag`.
- **Writes** are one row per participant (upsert on email). No hot paths.
- **Scoring** is O(participants) per recalc and runs on a schedule, not per request — it scales linearly and predictably.
- **Share-card images** are generated on demand and cached by Vercel's CDN.
- **Provider rate limits** are the main external constraint; the cron cadence keeps usage tiny. Raise cadence only during knockout rounds.

The data layer is a clean `Repo` interface (`lib/db/repo.ts`) with Supabase and in-memory implementations — swapping or sharding the datastore later touches one module.

---

## Backup recommendations

- **Supabase Free** includes point-in-time data but **no scheduled backups** and pauses after inactivity. Before and during the tournament:
  - Upgrade to **Supabase Pro** ($25/mo) for daily automated backups + no pausing, **or**
  - Run a weekly manual export: `/admin → Export participants CSV` (store in Drive), which captures every entry and pick.
- **Code** lives in the GitHub repo — that's your source-of-truth backup. Tag a release at launch.
- **Config** (`settings`, results) is small; the participants CSV plus the repo fully reconstruct state if needed.

---

## Routine upkeep

- **Weekly:** generate + post WhatsApp updates; export a participants CSV as a backup.
- **Per match day (knockouts):** verify **API status** is healthy; spot-check the results editor; hit **Recalculate** after big results.
- **After qualification finalizes:** update `qualified` flags in `lib/teams.ts`, run `npm run db:seed:gen`, re-apply `supabase/seed.sql`.
- **Post-tournament:** export final leaderboard CSV, announce the winner, archive the Supabase project.
