import Link from "next/link";
import { Countdown } from "@/components/Countdown";
import { InviteRivalryCard } from "@/components/InviteRivalryCard";
import type { ScoreMatch } from "@/lib/types";
import {
  ArrowRightIcon,
  GroupsIcon,
  PeopleIcon,
  SproutIcon,
  TrendingUpIcon,
  TrophyIcon,
} from "@/components/icons";
import { LinkButton } from "@/components/ui";
import { db } from "@/lib/db";
import { LIVE_PICKS_ENABLED } from "@/lib/flags";
import { currentLiveRoundView, liveMatchOpen, liveRound } from "@/lib/live";
import { openScoreMatches } from "@/lib/score-picks";
import { getLeaderboardData, getReferralStats, getRivalry, getTopChampionPick } from "@/lib/services";
import type { Rivalry } from "@/lib/services";
import { getSessionParticipant } from "@/lib/session";
import { now } from "@/lib/preview";
import { bonusPointsRemaining, pickStatus, SCORING_MILESTONES } from "@/lib/schedule";
import { teamFlag, teamName } from "@/lib/teams";
import { EMPTY_BONUS } from "@/lib/types";

export const dynamic = "force-dynamic";

const SIEMBRA_URL = "https://givebutter.com/siembra-con-lafamilia-foundation";

const STEPS = [
  { Icon: GroupsIcon, text: "Predict the 12 group winners, your Final Four and the champion." },
  { Icon: TrophyIcon, text: "Add Bonus Picks — Golden Ball, Boot, Glove and a Dark Horse." },
  { Icon: TrendingUpIcon, text: "Keep earning all tournament: predict scores and pick who advances in the knockouts." },
  { Icon: SproutIcon, text: "Support Siembra and help LaFamilia keep growing.", optional: true },
];

export default async function Home() {
  const repo = await db();
  const [topPick, settings, participants, me] = await Promise.all([
    getTopChampionPick(),
    repo.getSettings(),
    repo.listParticipants(),
    getSessionParticipant(),
  ]);
  const count = participants.length;

  // Returning member? Greet them and point at their next action — named
  // explicitly ("Bonus Picks"), never a vague "4 picks open".
  if (me) {
    const board = await getLeaderboardData(me.resumeToken);
    const [{ signups }, rivalry] = await Promise.all([
      getReferralStats(me.slug),
      getRivalry(me.resumeToken),
    ]);
    const nowD = await now();
    const status = pickStatus(nowD, settings.lockTime, settings.liveMatches);
    const bonusFilled = Object.values(me.predictions.bonus ?? EMPTY_BONUS).filter(Boolean).length;
    // Only Bonus Score Picks whose 24h window is OPEN and the member hasn't
    // predicted yet — the home nudge never points at a match that isn't
    // predictable, nor nags about one they've already done.
    const allScoreMatches = await repo.getScoreMatches();
    const myScorePredictedIds = new Set(
      (await repo.listScorePredictions(me.id)).map((p) => p.matchId),
    );
    const upcomingScoreMatches = openScoreMatches(allScoreMatches, nowD.getTime()).filter(
      (m) => !myScorePredictedIds.has(m.matchId),
    );

    // What can I do RIGHT NOW? Priority: pre-kickoff → Bonus Picks; during the
    // tournament → the next knockout (Live Picks) game still open. Bonus Score
    // Predictions get their own card below, so they're not duplicated here.
    let open: OpenAction | null = null;
    if (status.state === "bonus-open") {
      const remaining = 4 - bonusFilled;
      open =
        bonusFilled >= 4
          ? {
              // Already submitted, still editable before kickoff → "Edit", not "Finish".
              title: "Bonus Picks submitted ✓",
              detail: "Golden Ball, Boot, Glove & a Dark Horse — all set",
              pts: 0,
              action: "Edit my Bonus Picks",
              href: "/picks/bonus",
              lockIso: settings.lockTime,
              lockLabel: "Locks at kickoff",
            }
          : {
              title: bonusFilled === 0 ? "Make your Bonus Picks" : `${remaining} Bonus ${remaining === 1 ? "Pick" : "Picks"} left`,
              detail: "Golden Ball, Boot, Glove & a Dark Horse",
              pts: bonusPointsRemaining(me.predictions.bonus, settings.weights),
              action: bonusFilled === 0 ? "Make my Bonus Picks" : "Finish my Bonus Picks",
              href: "/picks/bonus",
              lockIso: settings.lockTime,
              lockLabel: "Locks at kickoff",
            };
    } else if (LIVE_PICKS_ENABLED) {
      // Knockouts: each game is pickable until its own kickoff. Surface the
      // current round if the member still has open games to pick.
      const liveRoundView = currentLiveRoundView(settings.liveMatches, nowD.getTime());
      if (liveRoundView?.hasOpenGames) {
        const openGames = liveRoundView.matches.filter((m) => liveMatchOpen(m, nowD.getTime()));
        const myLivePickIds = new Set(
          (await repo.getLivePicks(me.id))
            .filter((p) => p.round === liveRoundView.round)
            .map((p) => p.matchId),
        );
        const remaining = openGames.filter((g) => !myLivePickIds.has(g.matchId)).length;
        if (remaining > 0) {
          const lr = liveRound(liveRoundView.round);
          const soonestKickoff =
            openGames
              .map((g) => g.kickoffIso)
              .filter((k): k is string => Boolean(k))
              .sort()[0] ?? null;
          const allFresh = remaining === openGames.length;
          open = {
            title: allFresh
              ? `${lr?.label ?? "Knockouts"} — pick who advances`
              : `Finish your ${lr?.label ?? "Knockout"} picks`,
            detail: `${remaining} ${remaining === 1 ? "game" : "games"} open · pick who moves on`,
            pts: 0,
            action: allFresh ? "Make my Live Picks" : "Finish my Live Picks",
            href: "/picks/live",
            lockIso: soonestKickoff,
            lockLabel: "Next game locks in",
          };
        }
      }
    }

    return (
      <main className="flex flex-1 flex-col">
        <ReturningHero
          name={me.name.split(" ")[0]}
          rank={board.me?.rank ?? null}
          total={board.total}
          lockTime={settings.lockTime}
          open={open}
          nowMs={nowD.getTime()}
          signups={signups}
          rivalry={rivalry}
          upcomingScoreMatches={upcomingScoreMatches}
        />
        <WhatHappensNext
          kickoffIso={settings.lockTime}
          firstPointsIso={SCORING_MILESTONES[0].dateIso}
          nowMs={nowD.getTime()}
        />
      </main>
    );
  }

  // New visitor: once the tournament kicks off there's nothing to submit, so the
  // hero stops inviting picks and points them at the race instead.
  const started = (await now()).getTime() >= new Date(settings.lockTime).getTime();

  return (
    <main className="flex flex-1 flex-col">
      {/* Green hero — the full conversion area, all in one place */}
      <section className="bg-stadium px-5 pb-10 pt-14 text-left text-white">
        <div className="mx-auto max-w-md">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/lafamilia-logo-white.svg" alt="LaFamilia" className="h-20 w-auto" />

          {/* 1 — Title */}
          <h1 className="mt-7 text-4xl font-black leading-[1.08] tracking-tight sm:text-[2.6rem]">
            La Copa de LaFamilia{" "}
            <span className="text-[var(--color-gold)]">2026</span>
            {" ⚽"}
          </h1>

          {/* 2 — Subtitle */}
          <p className="mt-3 text-lg leading-relaxed text-white/90">
            The World Cup challenge for the Familia behind Latine innovation.
          </p>
          <p className="mt-2 text-sm leading-relaxed text-white/65">
            Free to play. Built to celebrate 5 years of LaFamilia and bring visibility to{" "}
            <a
              href={SIEMBRA_URL}
              target="_blank"
              rel="noreferrer"
              className="font-semibold text-[var(--color-gold-soft)] underline underline-offset-2"
            >
              Siembra
            </a>
            , our optional fundraising campaign.
          </p>

          {/* 3 — Conversion area, grouped in one subtle container inside the hero */}
          <div className="mt-7 rounded-2xl border border-white/15 bg-white/[0.06] px-5 py-6 text-center backdrop-blur-sm">
            {started ? (
              <>
                <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-[var(--color-gold-soft)]">
                  🔒 Predictions are closed
                </p>
                <p className="mx-auto mt-2 max-w-xs text-sm leading-relaxed text-white/85">
                  The tournament&apos;s underway. Follow the race and see who&apos;s leading the Familia.
                </p>
                <LinkButton href="/leaderboard" variant="gold" className="mt-5 w-full text-lg shadow-md">
                  See the leaderboard →
                </LinkButton>
              </>
            ) : (
              <>
                <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-[var(--color-gold-soft)]">
                  Predictions close in
                </p>
                <div className="mt-3 flex justify-center">
                  <Countdown
                    lockTime={settings.lockTime}
                    doneLabel="🔒 Predictions are closed — the tournament's underway!"
                  />
                </div>
                <LinkButton href="/play" variant="gold" className="mt-6 w-full text-lg shadow-md">
                  Submit Predictions →
                </LinkButton>
              </>
            )}

            {/* Secondary link — returning members who aren't recognized */}
            <p className="mt-3 text-sm text-white/80">
              Already played?{" "}
              <Link href="/edit" className="font-semibold text-white underline underline-offset-4">
                Find your picks
              </Link>
            </p>
          </div>

          {/* 4 — Social proof, side by side under the conversion area */}
          <div className="mt-4 grid grid-cols-2 gap-2">
            <span className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-white/12 px-3 py-2.5 text-center text-xs font-bold leading-tight backdrop-blur">
              <PeopleIcon className="h-4 w-4 shrink-0 text-[var(--color-gold-soft)]" />
              {count > 0 ? `${count} of the Familia are in` : "Be the first to join in"}
            </span>
            {topPick && (
              <span className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-white/12 px-3 py-2.5 text-center text-xs font-bold leading-tight backdrop-blur">
                <span className="shrink-0 text-base leading-none">{teamFlag(topPick.code)}</span>
                Most back {teamName(topPick.code)} · {topPick.pct}%
              </span>
            )}
          </div>
        </div>
      </section>

      <HowAndExplore />
    </main>
  );
}

/** Shared below-the-hero content (how to play + explore + belonging). */
function HowAndExplore() {
  return (
      <section className="mx-auto w-full max-w-md px-4 pb-20 pt-6">
        {/* How the Familia plays */}
        <div className="card p-5">
          <p className="mb-4 text-xs font-bold uppercase tracking-wider text-[var(--color-muted)]">
            How the Familia plays
          </p>
          <ul className="space-y-4">
            {STEPS.map(({ Icon, text, optional }) => (
              <li key={text} className="flex items-center gap-3.5">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[var(--color-cream)]">
                  <Icon className="h-7 w-7" />
                </span>
                <p className="text-[15px] font-medium leading-snug text-[var(--color-ink)]">
                  {optional && (
                    <span className="mr-1.5 align-middle text-[11px] font-bold uppercase tracking-wide text-[var(--color-muted)]">
                      Optional ·
                    </span>
                  )}
                  {text}
                </p>
              </li>
            ))}
          </ul>
        </div>

        {/* See the race */}
        <Link
          href="/leaderboard"
          className="group mt-6 flex items-center gap-4 rounded-2xl border border-[var(--color-line)] bg-white p-4 transition hover:border-[var(--color-pitch)] hover:shadow-sm"
        >
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[var(--color-cream)]">
            <TrendingUpIcon className="h-7 w-7" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-bold">Leaderboard</p>
            <p className="text-sm text-[var(--color-muted)]">See who&apos;s leading the Familia</p>
          </div>
          <ArrowRightIcon className="h-4 w-4 shrink-0 text-[var(--color-muted)] transition group-hover:translate-x-0.5 group-hover:text-[var(--color-pitch)]" />
        </Link>

        {/* Belonging — the heart of it */}
        <p className="mt-10 text-center text-lg font-extrabold tracking-tight text-[var(--color-ink)]">
          When one of us wins, the Familia wins. 🌎
        </p>
        <p className="mt-1 text-center text-sm text-[var(--color-muted)]">
          Hecho por LaFamilia, para LaFamilia.
        </p>
      </section>
  );
}

/** Welcome Back below-hero content: a plain, concrete "what comes next" for
 * someone who already made their picks (and may not follow soccer at all). */
function WhatHappensNext({
  kickoffIso,
  firstPointsIso,
  nowMs,
}: {
  kickoffIso: string;
  firstPointsIso: string;
  nowMs: number;
}) {
  const started = nowMs >= new Date(kickoffIso).getTime();
  const fmt = (iso: string) =>
    new Date(iso).toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      timeZone: "America/New_York",
    });

  const steps = started
    ? [
        { t: "Keep earning while the games play", d: "Predict the score of LatAm + Spain matches (+3 for the exact score, +1 for the winner) and pick who advances in each knockout game — before they kick off." },
        { t: "We score everything automatically", d: "Your bracket, Bonus Picks, score predictions and knockout picks all add up. No spreadsheets, nothing to track." },
        { t: "Climb the leaderboard", d: "Points update as games finish. See where you rank in the Familia — and what's still open to earn." },
      ]
    : [
        { t: `The World Cup starts ${fmt(kickoffIso)}`, d: "That's when the games begin." },
        { t: "We score your bracket automatically", d: "When a team you picked wins, you get points — nothing to track." },
        { t: "New ways to earn open up", d: `Once it starts you can predict scores and pick who advances each round. Your first points come in around ${fmt(firstPointsIso)}.` },
      ];

  return (
    <section className="mx-auto w-full max-w-md px-4 pb-20 pt-6">
      <div className="card p-5">
        <p className="mb-5 text-xs font-bold uppercase tracking-wider text-[var(--color-muted)]">
          What happens next
        </p>
        <ul className="space-y-5">
          {steps.map((s, i) => (
            <li key={i} className="flex items-start gap-3.5">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--color-pitch)] text-sm font-black text-white">
                {i + 1}
              </span>
              <div>
                <p className="font-bold leading-snug text-[var(--color-ink)]">{s.t}</p>
                <p className="mt-0.5 text-sm leading-snug text-[var(--color-muted)]">{s.d}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>

      {/* Belonging — the heart of it */}
      <p className="mt-10 text-center text-lg font-extrabold tracking-tight text-[var(--color-ink)]">
        When one of us wins, the Familia wins. 🌎
      </p>
      <p className="mt-1 text-center text-sm text-[var(--color-muted)]">
        Hecho por LaFamilia, para LaFamilia.
      </p>
    </section>
  );
}

/** A clearly-named action the member can take right now (e.g. Bonus Picks or the
 * next knockout game). `lockIso` is what the hero countdown points at (the
 * bracket lock, or the next game's kickoff); null hides the countdown. */
type OpenAction = {
  title: string;
  detail: string;
  pts: number;
  action: string;
  href: string;
  lockIso: string | null;
  lockLabel: string;
};

/** Returning-member hero: greet, show rank + the next open action. */
function ReturningHero({
  name,
  rank,
  total,
  lockTime,
  open,
  nowMs,
  signups,
  rivalry,
  upcomingScoreMatches,
}: {
  name: string;
  rank: number | null;
  total: number;
  lockTime: string;
  open: OpenAction | null;
  nowMs: number;
  signups: number;
  rivalry: Rivalry | null;
  upcomingScoreMatches: ScoreMatch[];
}) {
  const started = nowMs >= new Date(lockTime).getTime();
  return (
    <section className="bg-stadium px-5 pb-10 pt-14 text-left text-white">
      <div className="mx-auto max-w-md">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/lafamilia-logo-white.svg" alt="LaFamilia" className="h-12 w-auto" />

        <h1 className="mt-6 text-3xl font-black leading-tight tracking-tight">
          Welcome back, {name} 👋
        </h1>
        <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
          {rank ? (
            <span className="inline-flex items-center gap-1.5 rounded-xl bg-white/12 px-3 py-2 font-bold backdrop-blur">
              🏆 You&apos;re #{rank} of {total} in the Familia
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-xl bg-white/12 px-3 py-2 font-bold backdrop-blur">
              🏁 You&apos;re on the board with {total} of the Familia
            </span>
          )}
        </div>

        <div className="mt-6 rounded-2xl border border-white/15 bg-white/[0.06] px-5 py-6 text-center backdrop-blur-sm">
          {open ? (
            <>
              <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-[var(--color-gold-soft)]">
                ⚡ {open.title}
                {open.pts > 0 ? ` · ${open.pts} pts` : ""}
              </p>
              <p className="mt-1 text-sm text-white/85">{open.detail}</p>
              {open.lockIso && (
                <>
                  <p className="mt-4 text-[11px] font-semibold uppercase tracking-wider text-white/60">
                    {open.lockLabel}
                  </p>
                  <div className="mt-2 flex justify-center">
                    <Countdown lockTime={open.lockIso} />
                  </div>
                </>
              )}
              <LinkButton href={open.href} variant="gold" className="mt-6 w-full text-lg shadow-md">
                {open.action} →
              </LinkButton>
            </>
          ) : (
            <>
              <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-[var(--color-gold-soft)]">
                You&apos;re all caught up 🎉
              </p>
              <p className="mt-2 text-sm leading-relaxed text-white/85">
                {started
                  ? "Nothing to pick right now. We score everything automatically as games finish — and new score predictions and knockout picks open as the tournament rolls on. Check the leaderboard any time."
                  : "Your picks are saved, and the games haven't started yet. Once they kick off, we score everything for you automatically. Come back any time to check the leaderboard."}
              </p>
              <LinkButton href="/picks" variant="gold" className="mt-5 w-full text-lg shadow-md">
                See my picks →
              </LinkButton>
            </>
          )}
        </div>

        {upcomingScoreMatches.length > 0 && (
          <Link
            href="/picks/score"
            className="mt-4 block overflow-hidden rounded-2xl border border-[var(--color-gold-soft)]/40 bg-white/[0.06] backdrop-blur-sm transition hover:bg-white/[0.09]"
          >
            <div className="px-4 py-3">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--color-gold-soft)]">
                ⚽ Earn points now
              </p>
              <p className="mt-0.5 text-sm font-bold text-white">Predict the score · +3 pts</p>
              <p className="mt-0.5 text-xs text-white/70">
                {upcomingScoreMatches[0].teamA} vs {upcomingScoreMatches[0].teamB} · {upcomingScoreMatches[0].displayTimePt}
              </p>
            </div>
            <div className="border-t border-[var(--color-gold-soft)]/20 px-4 py-2 text-right text-xs font-bold text-[var(--color-gold-soft)]">
              Lock my score →
            </div>
          </Link>
        )}

        <div className="mt-4">
          <LinkButton href="/leaderboard" variant="outline" className="w-full !bg-white/12 !border-white/15 !text-white backdrop-blur">
            🏆 Leaderboard
          </LinkButton>
        </div>

        {/* Invite feedback — only before kickoff. Once the game's locked, new
            people can't join, so we don't push sharing (no dead ends). */}
        {!started && (
          <div className="mt-4">
            <InviteRivalryCard signups={signups} rivalry={rivalry} tone="dark" />
          </div>
        )}

        {/* Calm Siembra nudge — community-first, never blocking the game. */}
        <a
          href={SIEMBRA_URL}
          target="_blank"
          rel="noreferrer"
          className="mt-6 flex items-start gap-3 rounded-2xl border border-[var(--color-gold-soft)]/25 bg-white/[0.05] px-4 py-3.5 transition hover:bg-white/[0.08]"
        >
          <span className="mt-0.5 shrink-0 text-xl">🌱</span>
          <div className="min-w-0 flex-1">
            <p className="text-sm leading-snug text-white/85">
              La Copa&apos;s free to play. Siembra is how we keep building rooms where the Familia shows up for each other.
            </p>
            <span className="mt-1.5 inline-flex items-center gap-1 text-sm font-semibold text-[var(--color-gold-soft)]">
              Support Siembra →
            </span>
          </div>
        </a>
      </div>
    </section>
  );
}
