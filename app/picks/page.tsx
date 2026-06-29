import Link from "next/link";
import { HowPointsWork } from "@/components/HowPointsWork";
import { PicksSummary } from "@/components/PicksSummary";
import { LinkButton, PageShell, SectionTitle, TopNav } from "@/components/ui";
import { db } from "@/lib/db";
import { LIVE_PICKS_ENABLED } from "@/lib/flags";
import { currentLiveRoundView, liveMatchOpen, liveRound, matchesForRound } from "@/lib/live";
import { getSessionParticipant } from "@/lib/session";
import { now, PREVIEW_ENABLED } from "@/lib/preview";
import { openScoreMatches, scorePickState } from "@/lib/score-picks";
import { BONUS_POINTS_AVAILABLE, LIVE_ROUNDS, pickStatus } from "@/lib/schedule";
import { EMPTY_BONUS } from "@/lib/types";

export const dynamic = "force-dynamic";
export const metadata = { title: "Your Picks · La Copa de LaFamilia 2026" };

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    timeZone: "America/New_York",
  });
}

export default async function PicksHubPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; saved?: string }>;
}) {
  const { token, saved } = await searchParams;
  const repo = await db();
  const me = token ? await repo.getByToken(token) : await getSessionParticipant();

  if (!me) {
    return (
      <main className="flex flex-1 flex-col">
        <TopNav active="picks" />
        <PageShell>
          <div className="card mt-10 p-8 text-center">
            <div className="text-5xl">🎯</div>
            <h1 className="mt-3 text-2xl font-extrabold tracking-tight">Your picks live here</h1>
            <p className="mt-2 text-sm text-[var(--color-muted)]">
              Make your 3-minute bracket first. Then this is where you keep earning points
              all tournament long.
            </p>
            <LinkButton href="/play" variant="primary" className="mt-5 w-full">
              Make my bracket →
            </LinkButton>
            <Link href="/edit" className="mt-3 inline-block text-sm font-semibold underline underline-offset-4">
              Already played? Find my picks
            </Link>
          </div>
        </PageShell>
      </main>
    );
  }

  const settings = await repo.getSettings();
  const nowD = await now();
  const nowMs = nowD.getTime();
  const status = pickStatus(nowD, settings.lockTime);
  const bonus = me.predictions.bonus ?? EMPTY_BONUS;
  const bonusFilled = Object.values(bonus).filter(Boolean).length;
  const bonusOpen = status.state === "bonus-open";
  // Once the game locks, new people can't make a bracket, so "challenge a friend"
  // is a dead end — point locked-in members at the live game instead.
  const locked = nowMs >= new Date(settings.lockTime).getTime();
  // Bonus Score Picks: a match is predictable from now until its own kickoff,
  // then locked. The "Open now" card leads with the soonest; the schedule below
  // lists every still-open game — each one tappable straight to its prediction.
  const allScoreMatches = await repo.getScoreMatches();
  const openScoreNow = openScoreMatches(allScoreMatches, nowMs);
  // The schedule: every match that hasn't kicked off yet (open + upcoming), so
  // members can see when the next bonus-point chances open.
  const scoreSchedule = allScoreMatches.filter((m) => scorePickState(m, nowMs) !== "closed");

  // Live Picks are testable locally via the preview clock before the flag flips.
  const livePlayable = LIVE_PICKS_ENABLED || PREVIEW_ENABLED;
  // Live Picks: per-game model — the current knockout round stays accessible as
  // long as it has games still open to pick (not a narrow round-level window),
  // so the call-to-action remains available the whole round.
  const liveRoundView = livePlayable ? currentLiveRoundView(settings.liveMatches, nowMs) : null;
  const liveOpenGames = liveRoundView ? liveRoundView.matches.filter((m) => liveMatchOpen(m, nowMs)) : [];
  const myLivePickIds = liveRoundView
    ? new Set(
        (await repo.getLivePicks(me.id))
          .filter((p) => p.round === liveRoundView.round)
          .map((p) => p.matchId),
      )
    : new Set<string>();
  const livePickedOpen = liveOpenGames.filter((g) => myLivePickIds.has(g.matchId)).length;
  const liveLabel = liveRoundView ? liveRound(liveRoundView.round)?.label ?? "Knockouts" : "";

  return (
    <main className="flex flex-1 flex-col">
      <TopNav active="picks" />
      <PageShell>
        <div className="py-6">
          <SectionTitle emoji="🎯">Your Picks</SectionTitle>
          <p className="mt-1 text-sm text-[var(--color-muted)]">
            Your original bracket stays locked. New rounds give you new chances to earn points.
          </p>
        </div>

        {saved === "bonus" && (
          <div className="mb-5 rounded-2xl bg-[var(--color-pitch)]/10 px-4 py-3 text-sm font-semibold text-[var(--color-pitch)]">
            ✓ Bonus Picks saved. You can edit them anytime before kickoff.
          </div>
        )}

        {/* ── Open now ── */}
        <p className="mb-2 text-xs font-bold uppercase tracking-wider text-[var(--color-muted)]">
          Open now
        </p>

        {openScoreNow.length > 0 && (
          <Link
            href="/picks/score"
            className="card mb-3 block overflow-hidden border-2 border-[var(--color-gold)] shadow-sm transition hover:shadow-md"
          >
            <div className="flex items-center gap-4 p-4">
              <span
                className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-3xl shadow-sm"
                style={{ background: "linear-gradient(135deg, var(--color-gold-soft) 0%, var(--color-gold) 100%)" }}
              >
                ⚽
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="font-bold">Predict the score</p>
                  <span className="shrink-0 rounded-full bg-[var(--color-gold-soft)]/70 px-2 py-0.5 text-xs font-extrabold text-[#3a2b00]">
                    +3 pts
                  </span>
                </div>
                <p className="mt-0.5 text-sm text-[var(--color-muted)]">
                  {openScoreNow[0].teamA} vs {openScoreNow[0].teamB} · {openScoreNow[0].displayTimePt}
                </p>
              </div>
              <span className="shrink-0 text-lg text-[var(--color-gold)]">›</span>
            </div>
            <div className="bg-[var(--color-gold)] px-4 py-2.5 text-center text-sm font-bold text-[#3a2b00]">
              Lock my score →
            </div>
          </Link>
        )}

        {bonusOpen ? (
          <Link
            href="/picks/bonus"
            className="card mb-3 block overflow-hidden border-2 border-[var(--color-gold)] shadow-sm transition hover:shadow-md"
          >
            <div className="flex items-center gap-4 p-4">
              <span
                className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-3xl shadow-sm"
                style={{ background: "linear-gradient(135deg, var(--color-gold-soft) 0%, var(--color-gold) 100%)" }}
              >
                {bonusFilled >= 4 ? "🎉" : "🎁"}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="font-bold">Bonus Picks</p>
                  <span className="shrink-0 rounded-full bg-[var(--color-gold-soft)]/70 px-2 py-0.5 text-xs font-extrabold text-[#3a2b00]">
                    +{BONUS_POINTS_AVAILABLE} pts
                  </span>
                </div>
                <p className="mt-0.5 text-sm text-[var(--color-muted)]">
                  Golden Ball, Boot, Glove &amp; a Dark Horse
                </p>
              </div>
              <span className="shrink-0 text-right">
                <span className="block text-xs font-bold text-[var(--color-pitch)]">
                  {bonusFilled}/4 done
                </span>
                <span className="text-lg text-[var(--color-gold)]">›</span>
              </span>
            </div>
            <div className="bg-[var(--color-gold)] px-4 py-2.5 text-center text-sm font-bold text-[#3a2b00]">
              {bonusFilled === 0 ? "Add your Bonus Picks →" : bonusFilled < 4 ? "Finish your Bonus Picks →" : "Edit your Bonus Picks →"}
            </div>
          </Link>
        ) : liveRoundView && liveOpenGames.length > 0 ? (
          <Link
            href={`/picks/live?token=${me.resumeToken}`}
            className="card mb-3 block overflow-hidden border-2 border-[var(--color-navy)] shadow-sm transition hover:shadow-md"
          >
            <div className="flex items-center gap-4 p-4">
              <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[var(--color-navy)] text-3xl text-white">
                ⚡
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-bold">{liveLabel} — pick who advances</p>
                <p className="mt-0.5 text-sm text-[var(--color-muted)]">
                  {liveOpenGames.length} {liveOpenGames.length === 1 ? "game" : "games"} open · each locks at kickoff
                </p>
              </div>
              <span className="shrink-0 text-right">
                <span className="block text-xs font-bold text-[var(--color-pitch)]">
                  {livePickedOpen}/{liveOpenGames.length} picked
                </span>
                <span className="text-lg text-[var(--color-navy)]">›</span>
              </span>
            </div>
            <div className="bg-[var(--color-navy)] px-4 py-2.5 text-center text-sm font-bold text-white">
              {livePickedOpen === 0
                ? "Pick who advances →"
                : livePickedOpen < liveOpenGames.length
                  ? "Finish my picks →"
                  : "Edit my picks →"}
            </div>
          </Link>
        ) : (
          <div className="card mb-3 p-4 text-sm text-[var(--color-muted)]">
            Your bracket is locked and scoring as the games play out. Follow the race on the leaderboard.
          </div>
        )}

        {/* Bracket — your submitted picks, always visible (editable or locked) */}
        <div className="card mb-6 overflow-hidden">
          <div className="flex items-center gap-4 p-4">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[var(--color-cream)] text-2xl">
              {bonusOpen ? "✅" : "🔒"}
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-bold">Your bracket{bonusOpen ? " is in" : " is locked in"}</p>
              <p className="text-sm text-[var(--color-muted)]">
                {bonusOpen ? "Editable until kickoff." : "Locked for the tournament — here's what you picked."}
              </p>
            </div>
            {bonusOpen && (
              <Link href={`/r/${me.resumeToken}`} className="shrink-0 text-sm font-semibold text-[var(--color-pitch)]">
                Edit ›
              </Link>
            )}
          </div>
          <PicksSummary predictions={me.predictions} />
        </div>

        {/* ── Predict the score — the upcoming LatAm + Spain windows, so members
            know when the next bonus-point chances open. ── */}
        {scoreSchedule.length > 0 && (
          <>
            <p className="mb-2 mt-6 text-xs font-bold uppercase tracking-wider text-[var(--color-muted)]">
              Predict the score — coming up
            </p>
            <div className="card divide-y divide-[var(--color-line)] overflow-hidden">
              {scoreSchedule.slice(0, 6).map((m) => (
                // Every game in this list is open (predictable until its own
                // kickoff), so the whole row is a tap-through to that match's
                // prediction form. No state is shown that isn't actionable.
                <Link
                  key={m.matchId}
                  href={`/picks/score?me=${me.resumeToken}#m-${m.matchId}`}
                  className="flex items-center gap-3 px-4 py-3.5 transition hover:bg-black/[0.02]"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--color-cream)] text-base">
                    ⚽
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold">
                      {m.teamA} vs {m.teamB}
                    </p>
                    <p className="text-xs text-[var(--color-muted)]">
                      LatAm + Spain · +3 exact, +1 winner
                    </p>
                  </div>
                  <span className="shrink-0 rounded-full bg-[var(--color-pitch)] px-2.5 py-1 text-xs font-bold text-white">
                    Open now
                  </span>
                  <span className="shrink-0 text-lg text-[var(--color-muted)]">›</span>
                </Link>
              ))}
            </div>
            <p className="mt-3 text-center text-xs text-[var(--color-muted)]">
              Predict any game before it kicks off — each locks at its own kickoff. Tap one to lock in your score.
            </p>
          </>
        )}

        {/* ── Coming next — only when Live Picks is actually playable. While it's
            off we don't list rounds users can't pick yet (no broken promises). ── */}
        {livePlayable ? (
          <>
            <p className="mb-2 text-xs font-bold uppercase tracking-wider text-[var(--color-muted)]">
              Coming next
            </p>
            <div className="card divide-y divide-[var(--color-line)] overflow-hidden">
              {LIVE_ROUNDS.map((r) => {
                // Per-game status: a round is "Open" while any of its games are
                // still pickable, "Closed" once they've all kicked off, and shows
                // its open date until its matchups are drawn.
                const rm = matchesForRound(settings.liveMatches, r.round);
                const hasOpen = rm.some((m) => liveMatchOpen(m, nowMs));
                const closed = rm.length > 0 && !hasOpen;
                return (
                  <div key={r.round} className="flex items-center gap-3 px-4 py-3.5">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--color-cream)] text-sm font-black">
                      {r.round === "final" ? "🏆" : r.round.toUpperCase()}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold">{r.label}</p>
                      <p className="text-xs text-[var(--color-muted)]">Pick the winners of {r.plain}</p>
                    </div>
                    <span
                      className={
                        hasOpen
                          ? "shrink-0 rounded-full bg-[var(--color-pitch)] px-2.5 py-1 text-xs font-bold text-white"
                          : "shrink-0 text-xs font-semibold text-[var(--color-muted)]"
                      }
                    >
                      {hasOpen ? "Open" : closed ? "Closed" : `Opens ${fmtDate(r.opensIso)}`}
                    </span>
                  </div>
                );
              })}
            </div>
            <p className="mt-3 text-center text-xs text-[var(--color-muted)]">
              You can climb even if your champion is eliminated. New points open every round.
            </p>
          </>
        ) : (
          <div className="card p-5 text-center">
            <p className="text-sm font-semibold">More ways to play are coming during the tournament.</p>
            <p className="mt-1 text-xs text-[var(--color-muted)]">
              For now, your bracket and Bonus Picks are scored on the leaderboard.
            </p>
          </div>
        )}

        {/* Always-available plain-language explainer for non-experts. */}
        <div className="mt-6">
          <HowPointsWork w={settings.weights} />
        </div>

        {/* Before kickoff, grow the competition. Once locked, new players can't
            join — so send people to the live race instead of a dead-end invite. */}
        {locked ? (
          <LinkButton href="/leaderboard" variant="primary" className="mt-6 w-full">
            🏆 See the leaderboard
          </LinkButton>
        ) : (
          <LinkButton href={`/done?token=${me.resumeToken}`} variant="primary" className="mt-6 w-full">
            🔥 Challenge a Friend
          </LinkButton>
        )}
      </PageShell>
    </main>
  );
}
