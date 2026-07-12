import type { ReactNode } from "react";
import Link from "next/link";
import { Countdown } from "@/components/Countdown";
import { FamiliaInvitersBoard } from "@/components/FamiliaInvitersBoard";
import { Lane, LeaderboardList } from "@/components/LeaderboardList";
import { LedgerDrawer } from "@/components/LedgerDrawer";
import { ScorePicksPanel } from "@/components/ScorePicksPanel";
import { KnockoutPicksPanel } from "@/components/KnockoutPicksPanel";
import { SiembraBanner } from "@/components/Siembra";
import { LinkButton, PageShell, SectionTitle, TopNav } from "@/components/ui";
import { db } from "@/lib/db";
import { LIVE_PICKS_ENABLED } from "@/lib/flags";
import { currentLiveRoundView, liveMatchOpen, liveRound } from "@/lib/live";
import { getSessionToken } from "@/lib/session";
import { now, PREVIEW_ENABLED } from "@/lib/preview";
import {
  getFamiliaInviters,
  getKnockoutPicksView,
  getLeaderboardData,
  getScorePicksView,
  type LeaderboardView,
} from "@/lib/services";
import {
  nextOpenUnpredicted,
  openScoreMatches,
} from "@/lib/score-picks";
import { nextScoringMilestone } from "@/lib/schedule";
import { teamFlag, teamName } from "@/lib/teams";
import { DEFAULT_WEIGHTS, type LeaderboardRow, type ScoringWeights } from "@/lib/types";

const VIEWS: { key: LeaderboardView; label: string }[] = [
  { key: "overall", label: "Overall" },
  { key: "bracket", label: "Bracket" },
  { key: "score", label: "Scores" },
  { key: "live", label: "Knockouts" },
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

function PtRow({ label, value }: { label: ReactNode; value: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span>{label}</span>
      <span className="font-semibold">{value}</span>
    </div>
  );
}

/** The full, tap-to-expand scoring explainer. White-on-dark styling so it reads
 * on both the green "Before kickoff" card and the navy live-race card. */
function HowPointsWork({ w }: { w: ScoringWeights }) {
  const bracketMax = w.groupWinner * 12 + w.semifinalist * 4 + w.champion;
  const bonusMax = w.goldenBall + w.goldenBoot + w.goldenGlove + w.darkHorseSf;
  return (
    <details className="text-left">
      <summary className="flex cursor-pointer list-none items-center justify-center gap-1 text-xs font-semibold text-[var(--color-gold-soft)] underline-offset-4 hover:underline [&::-webkit-details-marker]:hidden">
        ⓘ How points work
      </summary>
      <div className="mx-auto mt-3 max-w-xs space-y-3 rounded-xl bg-white/15 p-3 text-sm">
        <p className="text-xs text-white/75">Four games — your Overall score adds them all up.</p>

        <div>
          <div className="mb-1 flex items-center justify-between font-bold">
            <span>🏆 The Bracket</span>
            <span className="text-[var(--color-gold-soft)]">up to {bracketMax}</span>
          </div>
          <div className="space-y-1 text-white/90">
            <PtRow label="🥇 Group winners" value={`${w.groupWinner} each · up to ${w.groupWinner * 12}`} />
            <PtRow label="🎯 Final Four" value={`${w.semifinalist} each · up to ${w.semifinalist * 4}`} />
            <PtRow label="👑 Champion" value={w.champion} />
          </div>
        </div>

        <div className="border-t border-white/15 pt-3">
          <div className="mb-1 flex items-center justify-between font-bold">
            <span>⭐ Bonus Picks</span>
            <span className="text-[var(--color-gold-soft)]">up to {bonusMax}</span>
          </div>
          <div className="space-y-1 text-white/90">
            <PtRow label="Golden Ball" value={w.goldenBall} />
            <PtRow label="Golden Boot" value={w.goldenBoot} />
            <PtRow label="Golden Glove" value={w.goldenGlove} />
            <PtRow
              label={<>Dark Horse <span className="text-white/55">(R16 / QF / SF)</span></>}
              value={`${w.darkHorseR16} / ${w.darkHorseQf} / ${w.darkHorseSf}`}
            />
          </div>
          <p className="mt-1 text-xs text-white/60">Dark Horse pays the furthest round reached — not added up.</p>
        </div>

        <div className="border-t border-white/15 pt-3">
          <div className="mb-1 font-bold">
            🎯 Score Predictions <span className="font-normal text-white/55">· LatAm + Spain</span>
          </div>
          <div className="space-y-1 text-white/90">
            <PtRow label="Exact score" value="+3" />
            <PtRow label="Right result only" value="+1" />
          </div>
          <p className="mt-1 text-xs text-white/60">
            Based on the 90-minute result (standard) — extra time and penalties don&apos;t count.
          </p>
        </div>

        <div className="border-t border-white/15 pt-3">
          <div className="mb-1 font-bold">
            ⚡ Knockout Picks <span className="font-normal text-white/55">· per round</span>
          </div>
          <div className="space-y-1 text-white/90">
            <PtRow
              label="Per correct winner"
              value={`${w.liveR32} / ${w.liveR16} / ${w.liveQf} / ${w.liveSf} / ${w.liveFinal}`}
            />
          </div>
          <p className="mt-1 text-xs text-white/75">
            <span className="font-semibold text-[var(--color-gold-soft)]">⚡ High Conviction</span>
            {" — tag your most confident pick each round; if it's right it scores "}
            <span className="font-semibold">double</span>. Wrong = no penalty.
          </p>
        </div>

        <p className="border-t border-white/15 pt-3 text-xs text-white/75">
          Ties are broken by your goals-in-the-final guess. Familia Honors are titles — they don&apos;t add points.
        </p>
      </div>
    </details>
  );
}

export default async function LeaderboardPage({
  searchParams,
}: {
  searchParams: Promise<{ me?: string; view?: string; show?: string }>;
}) {
  const { me: meParam, view: rawView } = await searchParams;
  // Highlight the viewer: an explicit ?me link wins, otherwise fall back to the
  // returning-member cookie so a recognized user is spotlighted automatically.
  const token = meParam ?? (await getSessionToken()) ?? undefined;
  const view: LeaderboardView =
    rawView === "bracket" || rawView === "live" || rawView === "score" ? rawView : "overall";
  const { total, all, me, leaderTotal, meGapToNext, scoringStarted, meScoreBreakdown } =
    await getLeaderboardData(token, 10, view);
  const inviters = await getFamiliaInviters(10, token);
  const nowMs = (await now()).getTime();
  const nextDrop = nextScoringMilestone(new Date(nowMs));
  const repo = await db();
  const settings = await repo.getSettings();
  const honorsLive = settings.awardsRevealed ?? false;
  // Once the game locks, no new signups are possible, so the invite challenge is
  // final, not a live race — relabel it as a result.
  const inviteChallengeClosed = nowMs >= new Date(settings.lockTime).getTime();
  const w = settings.weights ?? DEFAULT_WEIGHTS;
  // Bonus Score Pick windows. A match is only predictable in its 24h window
  // (opens 24h before kickoff, closes at kickoff) — the single source of truth.
  const allScoreMatches = await repo.getScoreMatches();
  const meParticipant = token ? await repo.getByToken(token) : null;
  const myScorePredictedIds = meParticipant
    ? new Set((await repo.listScorePredictions(meParticipant.id)).map((p) => p.matchId))
    : new Set<string>();
  // The "earn points now" card: the next OPEN match the viewer hasn't predicted.
  // Disappears once they've handled every open match (and never shows a match
  // whose window hasn't opened yet).
  const nextScoreMatch = nextOpenUnpredicted(allScoreMatches, nowMs, myScorePredictedIds);
  // Scores-tab countdown: the soonest open game, counting down to the kickoff it
  // locks at. Every game is open until kickoff, so there's no "opens in" state.
  const openScoreNow = openScoreMatches(allScoreMatches, nowMs)[0] ?? null;
  // Scores + Knockouts tabs: everyone's per-game predictions (each person's pick
  // reveals at that game's kickoff). Always the shared "everyone" view — the
  // per-viewer "mine" toggle was removed since this view already surfaces your
  // own pick and points alongside everyone else's. Only fetched on the active
  // tab so other views stay light.
  const scorePicks = view === "score" ? await getScorePicksView(token, "everyone") : null;
  const knockoutPicks = view === "live" ? await getKnockoutPicksView(token, "everyone") : null;
  // The soonest knockout match still to be played — powers the Knockouts-tab
  // countdown, mirroring the next-pick / next-drop countdowns on the other tabs.
  const nextLive =
    knockoutPicks?.rounds.flatMap((r) => r.cards).find((c) => !c.locked && c.kickoffIso) ?? null;

  // Knockouts are "open" — and the standings render — once a round's matchups
  // are drawn (the per-game model). Previously this keyed off a fixed round lock
  // time, which wrongly showed "picks are coming" while games were actually
  // pickable. Before any round is drawn we still show the calm "coming" state.
  const livePlayable = LIVE_PICKS_ENABLED || PREVIEW_ENABLED;
  const liveRoundView =
    view === "live" ? currentLiveRoundView(settings.liveMatches, nowMs) : null;
  const liveOpened = liveRoundView != null;
  const liveComingSoon = view === "live" && (!livePlayable || !liveOpened);

  // Live Picks action banner (Knockouts view only). Read-only: drives users to
  // the per-game pick screen. Hidden when no round is drawn, when nothing is
  // still open, or once every open game is already picked.
  let livePicksBanner: { roundLabel: string; openCount: number; pickedOpen: number } | null = null;
  if (view === "live" && livePlayable && liveRoundView?.hasOpenGames) {
    const openGames = liveRoundView.matches.filter((m) => liveMatchOpen(m, nowMs));
    const myRoundPickIds = meParticipant
      ? new Set(
          (await repo.getLivePicks(meParticipant.id))
            .filter((p) => p.round === liveRoundView.round)
            .map((p) => p.matchId),
        )
      : new Set<string>();
    const pickedOpen = openGames.filter((g) => myRoundPickIds.has(g.matchId)).length;
    if (pickedOpen < openGames.length) {
      livePicksBanner = {
        roundLabel: liveRound(liveRoundView.round)?.label ?? "Knockouts",
        openCount: openGames.length,
        pickedOpen,
      };
    }
  }

  const viewBlurb: Record<LeaderboardView, string> = {
    overall: "Your full score — every way you've earned points.",
    bracket: "Your original bracket only.",
    score: "Points from your LatAm + Spain score predictions only.",
    live: "Knockout picks — opens with the Round of 32.",
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

        {/* Next action, near the top: earn points RIGHT NOW by predicting a score.
            This is the live, do-it-today path during the group stage. */}
        {nextScoreMatch && view !== "live" && (
          <Link
            href={`/picks/score${token ? `?me=${token}` : ""}`}
            className="mb-3 block rounded-2xl bg-[var(--color-pitch)] px-4 py-4 text-white"
          >
            <p className="text-xs font-bold uppercase tracking-wider text-[var(--color-gold-soft)]">
              ⚡ Earn points now
            </p>
            <p className="mt-1 text-lg font-black leading-tight">
              Predict the score — {nextScoreMatch.teamA} vs {nextScoreMatch.teamB}
            </p>
            <p className="mt-0.5 text-sm text-white/85">
              +3 for the exact score · +1 for the winner →
            </p>
          </Link>
        )}

        {/* Knockouts view: a clear prompt to make/finish Live Picks, straight to
            the per-game pick screen. Personalized + shown only when games are
            still open (see livePicksBanner). */}
        {livePicksBanner && (
          <Link
            href={`/picks/live${token ? `?me=${token}` : ""}`}
            className="mb-3 block rounded-2xl bg-[var(--color-pitch)] px-4 py-4 text-white"
          >
            <p className="text-xs font-bold uppercase tracking-wider text-[var(--color-gold-soft)]">
              ⚡ {livePicksBanner.pickedOpen > 0 ? "Finish your Live Picks" : "Live Picks are open"}
            </p>
            <p className="mt-1 text-lg font-black leading-tight">
              {livePicksBanner.pickedOpen > 0
                ? `${livePicksBanner.pickedOpen} of ${livePicksBanner.openCount} open games picked`
                : `Pick who advances — ${livePicksBanner.roundLabel}`}
            </p>
            <p className="mt-0.5 text-sm text-white/85">
              {livePicksBanner.pickedOpen > 0
                ? "Pick the rest before they lock at kickoff"
                : `${livePicksBanner.openCount} ${livePicksBanner.openCount === 1 ? "game" : "games"} open · each locks at kickoff`}
            </p>
            <span className="mt-2 inline-block rounded-full bg-white/15 px-3 py-1 text-xs font-bold">
              {livePicksBanner.pickedOpen > 0 ? "Complete your picks →" : "Make your Live Picks →"}
            </span>
          </Link>
        )}

        {/* Counter + scoring transparency box — ALWAYS visible, on every tab and
            in every state, so the full point system is open to everyone. The
            countdown on top adapts per tab (next score pick / next big bracket
            drop); the "How points work" breakdown sits right under it. */}
        <div className="mb-5 rounded-2xl bg-[var(--color-navy)] px-4 py-5 text-center text-white">
          {view === "live" && nextLive?.kickoffIso ? (
            <>
              <p className="text-xs font-bold uppercase tracking-wider text-[var(--color-gold-soft)]">
                ⚡ Next match kicks off in
              </p>
              <div className="mt-3 flex justify-center">
                <Countdown lockTime={nextLive.kickoffIso} doneLabel="⏱️ Kicking off — this match is locking…" />
              </div>
              <p className="mt-3 text-sm font-semibold">
                {teamFlag(nextLive.homeCode)} {teamName(nextLive.homeCode)} vs {teamFlag(nextLive.awayCode)}{" "}
                {teamName(nextLive.awayCode)}
              </p>
              <p className="mt-1 text-xs text-white/75">
                Pick who advances before kickoff — {knockoutPicks?.pointsEach}{" "}
                {knockoutPicks?.pointsEach === 1 ? "pt" : "pts"}
              </p>
            </>
          ) : view === "score" && openScoreNow ? (
            <>
              <p className="text-xs font-bold uppercase tracking-wider text-[var(--color-gold-soft)]">
                ⚡ Next pick locks in
              </p>
              <div className="mt-3 flex justify-center">
                <Countdown lockTime={openScoreNow.kickoffUtc} />
              </div>
              <p className="mt-3 text-sm font-semibold">
                {openScoreNow.teamA} vs {openScoreNow.teamB}
              </p>
              <p className="mt-1 text-xs text-white/75">
                Predict the score before kickoff — up to +3 pts
              </p>
            </>
          ) : nextDrop && view !== "live" ? (
            <>
              <p className="text-xs font-bold uppercase tracking-wider text-[var(--color-gold-soft)]">
                ⚡ {scoringStarted ? "Next big points in" : "First bracket points in"}
              </p>
              <div className="mt-3 flex justify-center">
                <Countdown lockTime={nextDrop.dateIso} />
              </div>
              <p className="mt-3 text-sm font-semibold">{nextDrop.whenLabel}</p>
              <p className="mt-1 text-xs text-white/75">
                Up to {nextDrop.pointsInPlay} points from {nextDrop.fromPicks}
              </p>
            </>
          ) : null}

          {/* How points work — under the counter, on every tab. Divider only when
              there's a countdown above it (none on the Knockouts tab). */}
          <div
            className={
              (view === "live" && nextLive?.kickoffIso) ||
              (view === "score" && openScoreNow) ||
              (nextDrop && view !== "live")
                ? "mt-4 border-t border-white/15 pt-4"
                : ""
            }
          >
            <HowPointsWork w={w} />
          </div>
        </div>

        {/* ── THE STANDINGS — the main event, front and center ── */}
        {liveComingSoon ? (
          <div className="card overflow-hidden">
            <div className="bg-[var(--color-navy)] px-5 py-7 text-center text-white">
              <p className="text-3xl">⚡</p>
              <p className="mt-2 font-black">Knockout picks are coming</p>
              <p className="mt-3 text-sm leading-relaxed text-white/85">
                When the knockouts start, you&apos;ll pick who advances each round. For now, every
                point from your bracket, Bonus Picks, and score predictions counts here.
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
                  ⚡ Who&apos;s Moving Up
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
                        {" · "}Knockouts <strong>{meScoreBreakdown.live}</strong>
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

        {/* Scores tab: your locked picks / everyone's predictions — below the
            standings so the podium stays at the top, consistent with other tabs. */}
        {view === "score" && scorePicks && (
          <div className="mt-4">
            <ScorePicksPanel
              loggedIn={scorePicks.loggedIn}
              scorePickTotal={scorePicks.scorePickTotal}
              cards={scorePicks.cards}
            />
          </div>
        )}

        {view === "live" && knockoutPicks && knockoutPicks.rounds.length > 0 && (
          <div className="mt-4">
            <KnockoutPicksPanel
              loggedIn={knockoutPicks.loggedIn}
              livePickTotal={knockoutPicks.livePickTotal}
              rounds={knockoutPicks.rounds}
            />
          </div>
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

        {/* ── Secondary, below the race: honors, the separate Familia challenge,
            and the mission. Moved down so the competition leads. ── */}
        <div className="mt-10 space-y-4">
          <Link
            href="/awards"
            className="flex items-center justify-between rounded-2xl bg-[var(--color-gold-soft)]/50 px-4 py-3 font-semibold"
          >
            <span>🏆 {honorsLive ? "The Familia Honors are in" : "8 Familia Honors up for grabs"}</span>
            <span className="text-sm">{honorsLive ? "See the winners →" : "See them all →"}</span>
          </Link>

          {/* Bringing the Familia — a SEPARATE side challenge, tucked behind a
              toggle. Once the game locks it's final (no new signups), so it
              reads as a result, not an active race. */}
          <details className="overflow-hidden rounded-2xl border border-[var(--color-line)]">
            <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3 [&::-webkit-details-marker]:hidden">
              <span className="font-semibold">
                🤝 Bringing the Familia{" "}
                <span className="text-xs font-normal text-[var(--color-muted)]">
                  · {inviteChallengeClosed ? "final standings" : "a separate side challenge"}
                </span>
              </span>
              <span className="text-[var(--color-muted)]">▾</span>
            </summary>
            <div className="px-4 pb-4">
              <p className="mb-3 text-xs text-[var(--color-muted)]">
                {inviteChallengeClosed
                  ? "A side game from before kickoff — final now that the game's locked. Never counted toward your main score."
                  : "A fun side game — these points don’t count toward your main score."}
              </p>
              <FamiliaInvitersBoard
                top={inviters.top}
                me={inviters.me}
                total={inviters.total}
                closed={inviteChallengeClosed}
              />
            </div>
          </details>

          <SiembraBanner />
        </div>
      </PageShell>
      <LedgerDrawer />
    </main>
  );
}
