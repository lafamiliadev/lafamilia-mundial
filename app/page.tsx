import Link from "next/link";
import { Countdown } from "@/components/Countdown";
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
import { getLeaderboardData, getTopChampionPick } from "@/lib/services";
import { getSessionParticipant } from "@/lib/session";
import { now } from "@/lib/preview";
import { bonusPointsRemaining, pickStatus, SCORING_MILESTONES } from "@/lib/schedule";
import { teamFlag, teamName } from "@/lib/teams";
import { EMPTY_BONUS } from "@/lib/types";

export const dynamic = "force-dynamic";

const SIEMBRA_URL = "https://givebutter.com/siembra-con-lafamilia-foundation";

const STEPS = [
  { Icon: GroupsIcon, text: "Pick the 12 group winners in just a few taps." },
  { Icon: TrophyIcon, text: "Pick your Final Four and champion." },
  { Icon: TrendingUpIcon, text: "Climb the leaderboard and earn prizes." },
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
    const nowD = await now();
    const status = pickStatus(nowD, settings.lockTime);
    const bonusFilled = Object.values(me.predictions.bonus ?? EMPTY_BONUS).filter(Boolean).length;

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
            }
          : {
              title: bonusFilled === 0 ? "Make your Bonus Picks" : `${remaining} Bonus ${remaining === 1 ? "Pick" : "Picks"} left`,
              detail: "Golden Ball, Boot, Glove & a Dark Horse",
              pts: bonusPointsRemaining(me.predictions.bonus, settings.weights),
              action: bonusFilled === 0 ? "Make my Bonus Picks" : "Finish my Bonus Picks",
              href: "/picks/bonus",
            };
    } else if (LIVE_PICKS_ENABLED && status.state === "round-open") {
      open = {
        title: `${status.round.label} Live Picks are open`,
        detail: `Pick the winners of ${status.round.plain}`,
        pts: status.round.pointsInPlay,
        action: "Make my Live Picks",
        href: "/picks",
      };
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
        { t: "The tournament is underway", d: "Matches are being played right now." },
        { t: "We score your picks for you", d: "When a team you picked wins, you get points. You don't have to do a thing." },
        { t: "Check your score anytime", d: "We update your points as games finish. See where you rank on the leaderboard." },
      ]
    : [
        { t: `The World Cup starts ${fmt(kickoffIso)}`, d: "That's when the games begin." },
        { t: "We score your picks for you", d: "When a team you picked wins, you get points. You don't have to do a thing." },
        { t: "Come back to check your score", d: `Your first points come in around ${fmt(firstPointsIso)}. See where you rank on the leaderboard.` },
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

/** A clearly-named action the member can take right now (e.g. Bonus Picks). */
type OpenAction = { title: string; detail: string; pts: number; action: string; href: string };

/** Returning-member hero: greet, show rank + the next open action. */
function ReturningHero({
  name,
  rank,
  total,
  lockTime,
  open,
  nowMs,
}: {
  name: string;
  rank: number | null;
  total: number;
  lockTime: string;
  open: OpenAction | null;
  nowMs: number;
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
              <p className="mt-4 text-[11px] font-semibold uppercase tracking-wider text-white/60">
                Locks at kickoff
              </p>
              <div className="mt-2 flex justify-center">
                <Countdown lockTime={lockTime} />
              </div>
              <LinkButton href={open.href} variant="gold" className="mt-6 w-full text-lg shadow-md">
                {open.action} →
              </LinkButton>
            </>
          ) : (
            <>
              <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-[var(--color-gold-soft)]">
                You&apos;re all set 🎉
              </p>
              <p className="mt-2 text-sm leading-relaxed text-white/85">
                {started
                  ? "Your picks are saved. As the games are played, we'll score your predictions for you automatically. Come back any time to check the leaderboard."
                  : "Your picks are saved, and the games haven't started yet. Once they kick off, we'll score your predictions for you automatically. Come back any time to check the leaderboard."}
              </p>
              <LinkButton href="/picks" variant="gold" className="mt-5 w-full text-lg shadow-md">
                See my picks →
              </LinkButton>
            </>
          )}
        </div>

        <div className="mt-4">
          <LinkButton href="/leaderboard" variant="outline" className="w-full !bg-white/12 !border-white/15 !text-white backdrop-blur">
            🏆 Leaderboard
          </LinkButton>
        </div>

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
