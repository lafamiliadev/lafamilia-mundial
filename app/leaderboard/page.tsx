import Link from "next/link";
import { Countdown } from "@/components/Countdown";
import { FamiliaInvitersBoard } from "@/components/FamiliaInvitersBoard";
import { Lane, LeaderboardList } from "@/components/LeaderboardList";
import { SiembraBanner } from "@/components/Siembra";
import { LinkButton, PageShell, SectionTitle, TopNav } from "@/components/ui";
import { db } from "@/lib/db";
import { LIVE_PICKS_ENABLED } from "@/lib/flags";
import { getSessionToken } from "@/lib/session";
import { now, PREVIEW_ENABLED } from "@/lib/preview";
import { getFamiliaInviters, getLeaderboardData, type LeaderboardView } from "@/lib/services";
import { LIVE_ROUNDS, nextScoringMilestone } from "@/lib/schedule";
import { teamFlag } from "@/lib/teams";
import { DEFAULT_WEIGHTS, type LeaderboardRow } from "@/lib/types";

const VIEWS: { key: LeaderboardView; label: string }[] = [
  { key: "overall", label: "Overall Race" },
  { key: "bracket", label: "Bracket" },
  { key: "live", label: "Live Picks" },
];

function ViewTabs({ active, token }: { active: LeaderboardView; token?: string }) {
  const qs = (v: LeaderboardView) =>
    `/leaderboard?${new URLSearchParams({ ...(token ? { me: token } : {}), ...(v !== "overall" ? { view: v } : {}) }).toString()}`;
  return (
    <div className="mb-5 flex gap-1 rounded-2xl bg-black/[0.04] p-1">
      {VIEWS.map((v) => (
        <Link
          key={v.key}
          href={qs(v.key)}
          className={`flex-1 rounded-xl px-2 py-2 text-center text-sm font-bold transition ${
            active === v.key
              ? "bg-white text-[var(--color-ink)] shadow-sm"
              : "text-[var(--color-muted)] hover:text-[var(--color-ink)]"
          }`}
        >
          {v.label}
        </Link>
      ))}
    </div>
  );
}

export const dynamic = "force-dynamic";
export const metadata = { title: "Leaderboard · La Copa de LaFamilia 2026" };

const PODIUM = [
  { medal: "🥇", color: "#f5b301", bar: "h-24", ring: "ring-[#f5b301]" },
  { medal: "🥈", color: "#c2c7d0", bar: "h-16", ring: "ring-[#c2c7d0]" },
  { medal: "🥉", color: "#cd7f32", bar: "h-12", ring: "ring-[#cd7f32]" },
];

function Podium({ rows }: { rows: LeaderboardRow[] }) {
  // Visual order places #1 in the center: [2nd, 1st, 3rd].
  const order = [rows[1], rows[0], rows[2]];
  const placeFor = (r: LeaderboardRow) => rows.indexOf(r); // 0,1,2
  return (
    <div className="grid grid-cols-3 items-end gap-2">
      {order.map((r, i) => {
        if (!r) return <div key={i} />;
        const place = placeFor(r);
        const p = PODIUM[place];
        return (
          <Link key={r.name + i} href={`/copa/${r.slug}`} className="flex flex-col items-center">
            {place === 0 && <div className="text-xl leading-none">👑</div>}
            <div
              className={`mb-1 flex h-12 w-12 items-center justify-center rounded-full bg-white text-xl ring-2 ${p.ring}`}
            >
              {p.medal}
            </div>
            <p className="max-w-full truncate text-center text-sm font-bold underline-offset-4 hover:underline">
              {r.name}
            </p>
            <p className="text-xs text-[var(--color-muted)]" title="Pick to win">
              🏆 {teamFlag(r.champion)}
            </p>
            <p className="text-sm font-black tabular-nums">{r.total} pts</p>
            <div
              className={`mt-2 flex w-full ${p.bar} items-start justify-center rounded-t-xl pt-2 text-lg font-black text-white`}
              style={{ background: p.color }}
            >
              {place + 1}
            </div>
          </Link>
        );
      })}
    </div>
  );
}

export default async function LeaderboardPage({
  searchParams,
}: {
  searchParams: Promise<{ me?: string; view?: string }>;
}) {
  const { me: meParam, view: rawView } = await searchParams;
  // Highlight the viewer: an explicit ?me link wins, otherwise fall back to the
  // returning-member cookie so a recognized user is spotlighted automatically.
  const token = meParam ?? (await getSessionToken()) ?? undefined;
  const view: LeaderboardView =
    rawView === "bracket" || rawView === "live" ? rawView : "overall";
  const { total, all, me, leaderTotal, meGapToNext, scoringStarted, meScoreBreakdown } =
    await getLeaderboardData(token, 10, view);
  const inviters = await getFamiliaInviters(10, token);
  const nowMs = (await now()).getTime();
  const nextDrop = nextScoringMilestone(new Date(nowMs));
  const repo = await db();
  const settings = await repo.getSettings();
  const honorsLive = settings.awardsRevealed ?? false;
  const w = settings.weights ?? DEFAULT_WEIGHTS;

  // Live Picks isn't playable yet (LIVE_PICKS_ENABLED) — and even once it is, the
  // board is empty until the first knockout round locks. Either way, show a calm
  // "coming later" state instead of an empty/broken board.
  const livePlayable = LIVE_PICKS_ENABLED || PREVIEW_ENABLED;
  const liveOpened = nowMs >= new Date(LIVE_ROUNDS[0].locksIso).getTime();
  const liveComingSoon = view === "live" && (!livePlayable || !liveOpened);

  const viewBlurb: Record<LeaderboardView, string> = {
    overall: livePlayable ? "Bracket + Bonus + Live Picks combined." : "Bracket + Bonus picks combined.",
    bracket: "Your original 3-minute bracket only.",
    live: "Coming later in the tournament.",
  };

  const podiumRows = all.slice(0, 3);
  const chasers = all.slice(3);

  return (
    <main className="flex flex-1 flex-col">
      <TopNav active="leaderboard" />
      <PageShell>
        <div className="py-6">
          <SectionTitle emoji="🏆">The Race</SectionTitle>
          <p className="mt-1 text-sm text-[var(--color-muted)]">
            {total} predicting. <strong>Top 3 take home prizes</strong> 🏅
          </p>
        </div>

        <ViewTabs active={view} token={token} />
        <p className="-mt-2 mb-5 text-xs text-[var(--color-muted)]">{viewBlurb[view]}</p>

        {/* Mission, front and center — supporting Siembra is why we play. */}
        <div className="mb-5">
          <SiembraBanner />
        </div>

        {/* Bringing the Familia — the invite competition. Alive before any match
            is played, so it's the live race during the pre-tournament window. */}
        <div className="mb-5">
          <FamiliaInvitersBoard top={inviters.top} me={inviters.me} total={inviters.total} />
        </div>

        {/* Always link the Hall of Honors — before the finale it builds
            anticipation (8 awards up for grabs), after it shows the winners. */}
        <Link
          href="/awards"
          className="mb-5 flex items-center justify-between rounded-2xl bg-[var(--color-gold-soft)]/50 px-4 py-3 font-semibold"
        >
          <span>🏆 {honorsLive ? "The Familia Honors are in" : "8 Familia Honors up for grabs"}</span>
          <span className="text-sm">{honorsLive ? "See the winners →" : "See them all →"}</span>
        </Link>

        {/* Next points drop — explained for someone new to soccer/fantasy. */}
        {nextDrop && view !== "live" && (
          <div className="mb-5 rounded-2xl bg-[var(--color-navy)] px-4 py-5 text-center text-white">
            <p className="text-xs font-bold uppercase tracking-wider text-[var(--color-gold-soft)]">
              ⚡ {scoringStarted ? "Next points awarded in" : "First points awarded in"}
            </p>
            <div className="mt-3 flex justify-center">
              <Countdown lockTime={nextDrop.dateIso} />
            </div>
            <p className="mt-3 text-sm font-semibold">{nextDrop.whenLabel}</p>
            <p className="mt-1 text-xs text-white/75">
              Up to {nextDrop.pointsInPlay} points available from {nextDrop.fromPicks}
            </p>
          </div>
        )}

        {liveComingSoon ? (
          <div className="card overflow-hidden">
            <div className="bg-[var(--color-navy)] px-5 py-7 text-center text-white">
              <p className="text-3xl">⚡</p>
              <p className="mt-2 font-black">More ways to play are coming</p>
              <p className="mt-3 text-sm leading-relaxed text-white/85">
                We&apos;re adding a new way to earn points during the tournament. For now, every point
                from your bracket and Bonus Picks counts in the Overall race.
              </p>
            </div>
          </div>
        ) : total === 0 ? (
          <div className="card p-8 text-center">
            <div className="text-4xl">🫥</div>
            <p className="mt-3 font-bold">No predictors yet</p>
            <p className="mt-1 text-sm text-[var(--color-muted)]">Be the first on the starting line.</p>
            <LinkButton href="/play" variant="primary" className="mt-5 w-full">
              Make your predictions →
            </LinkButton>
          </div>
        ) : !scoringStarted ? (
          // ── Starting line: nobody has scored yet ──
          <div className="card overflow-hidden">
            <div className="bg-[var(--color-pitch)] px-4 py-4 text-center text-white">
              <p className="text-2xl">🏁</p>
              <p className="mt-1 font-black">Before kickoff</p>
              <p className="mt-1 text-sm text-white/85">
                Everyone starts at 0 points. The leaderboard comes alive
                {nextDrop ? ` ${nextDrop.whenLabel.toLowerCase()}` : " when the tournament begins"} and
                the first predictions are scored.
              </p>

              {/* Quiet, tap-to-expand scoring explainer */}
              <details className="mt-3 text-left">
                <summary className="flex cursor-pointer list-none items-center justify-center gap-1 text-xs font-semibold text-[var(--color-gold-soft)] underline-offset-4 hover:underline [&::-webkit-details-marker]:hidden">
                  ⓘ How points work
                </summary>
                <div className="mx-auto mt-2 max-w-xs rounded-xl bg-white/15 p-3 text-sm">
                  <ul className="space-y-1.5">
                    <li className="flex items-center justify-between gap-3">
                      <span>🥇 Group winners</span>
                      <span className="font-semibold">{w.groupWinner} each · up to {w.groupWinner * 12}</span>
                    </li>
                    <li className="flex items-center justify-between gap-3">
                      <span>🎯 Final Four</span>
                      <span className="font-semibold">{w.semifinalist} each · up to {w.semifinalist * 4}</span>
                    </li>
                    <li className="flex items-center justify-between gap-3">
                      <span>🏆 Champion</span>
                      <span className="font-semibold">{w.champion}</span>
                    </li>
                    <li className="flex items-center justify-between gap-3">
                      <span>🧹 All 12 groups right</span>
                      <span className="font-semibold">+{w.groupSweepBonus}</span>
                    </li>
                  </ul>
                  <p className="mt-2 text-xs text-white/75">
                    Ties are broken by your goals-in-the-final guess.
                  </p>
                  <p className="mt-1 text-xs font-semibold">
                    Sharpest read across the whole tournament wins — not just the champion.
                  </p>
                </div>
              </details>
            </div>
            <div className="divide-y divide-[var(--color-line)]">
              <LeaderboardList rows={all} variant="start" initial={10} />
            </div>
          </div>
        ) : (
          // ── Live race ──
          <>
            {podiumRows.length >= 1 && (
              <div className="card p-4">
                <Podium rows={podiumRows} />
                <p className="mt-3 text-center text-xs font-semibold text-[var(--color-muted)]">
                  Top 3 win. The whole board&apos;s still in play.
                </p>
              </div>
            )}

            {chasers.length > 0 && (
              <div className="card mt-4 divide-y divide-[var(--color-line)] overflow-hidden">
                <div className="bg-black/[0.03] px-4 py-2 text-xs font-bold uppercase tracking-wider text-[var(--color-muted)]">
                  The chase
                </div>
                <LeaderboardList
                  rows={chasers}
                  variant="race"
                  leaderTotal={leaderTotal}
                  initial={7}
                  pinMe={false}
                />
              </div>
            )}

            {/* Your position + the gap to catch */}
            {me && me.rank > 3 && (
              <>
                <p className="mt-5 mb-2 text-xs font-bold uppercase tracking-wider text-[var(--color-muted)]">
                  Your spot
                </p>
                <div className="card overflow-hidden">
                  <Lane r={me} leaderTotal={leaderTotal} />
                  {meScoreBreakdown && (
                    <div className="border-t border-[var(--color-line)] px-4 py-2.5">
                      <p className="text-xs text-[var(--color-muted)]">
                        <span className="font-semibold text-[var(--color-ink)]">Breakdown</span>
                        {" · "}Bracket <strong>{meScoreBreakdown.bracket}</strong>
                        {" · "}Bonus picks <strong>{meScoreBreakdown.bonus}</strong>
                        {" · "}Live <strong>{meScoreBreakdown.live}</strong>
                        {meScoreBreakdown.scorePick > 0 && (
                          <> · Score predictions <strong>{meScoreBreakdown.scorePick}</strong></>
                        )}
                      </p>
                    </div>
                  )}
                </div>
                {meGapToNext != null && meGapToNext > 0 && (
                  <p className="mt-2 text-center text-sm font-semibold text-[var(--color-ink)]">
                    {meGapToNext} {meGapToNext === 1 ? "point" : "points"} behind #{me.rank - 1}. Catchable. 🔥
                  </p>
                )}
              </>
            )}
          </>
        )}

        {!me && total > 0 && (
          <p className="mt-5 text-center text-sm text-[var(--color-muted)]">
            Already played?{" "}
            <Link href="/edit" className="font-semibold underline underline-offset-4">
              Find your picks
            </Link>{" "}
            to see your spot.
          </p>
        )}
      </PageShell>
    </main>
  );
}
