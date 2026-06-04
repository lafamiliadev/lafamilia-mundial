import Link from "next/link";
import { Countdown } from "@/components/Countdown";
import {
  ArrowRightIcon,
  GroupsIcon,
  InsightsIcon,
  PeopleIcon,
  SproutIcon,
  TrendingUpIcon,
  TrophyIcon,
} from "@/components/icons";
import { db } from "@/lib/db";
import { getParticipantCount, getTopChampionPick } from "@/lib/services";
import { teamFlag, teamName } from "@/lib/teams";

export const dynamic = "force-dynamic";

// Warm, festive brand palette per step — celebration, not a monochrome dashboard.
const STEPS = [
  {
    Icon: GroupsIcon,
    text: "Pick the 12 group winners in just a few taps.",
    chip: "bg-[var(--color-coral)]/12 text-[var(--color-coral)]",
  },
  {
    Icon: TrophyIcon,
    text: "Pick your Final Four and champion.",
    chip: "bg-[var(--color-gold)]/20 text-[#a9760a]",
  },
  {
    Icon: TrendingUpIcon,
    text: "Climb the leaderboard and earn prizes.",
    chip: "bg-[var(--color-pitch)]/10 text-[var(--color-pitch)]",
  },
  {
    Icon: SproutIcon,
    text: "Support Siembra and help LaFamilia keep growing.",
    optional: true,
    chip: "bg-[var(--color-siembra)]/12 text-[var(--color-siembra)]",
  },
];

const FIESTA = "linear-gradient(135deg, #ff2d6f 0%, #ff6b1a 55%, #ffb627 100%)";

export default async function Home() {
  const [count, topPick, settings] = await Promise.all([
    getParticipantCount(),
    getTopChampionPick(),
    (await db()).getSettings(),
  ]);

  return (
    <main className="flex flex-1 flex-col">
      {/* Hero */}
      <section className="bg-stadium px-5 pb-9 pt-14 text-center text-white">
        <div className="mx-auto max-w-md">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/lafamilia-logo-white.svg" alt="LaFamilia" className="mx-auto h-20 w-auto" />
          <p className="mt-6 text-sm font-bold uppercase tracking-[0.22em] text-[var(--color-gold-soft)]">
            Bienvenidos a la Familia
          </p>
          <h1 className="mt-2 text-4xl font-black leading-[1.08] tracking-tight sm:text-[2.6rem]">
            {"La Copa de LaFamilia ⚽"}
          </h1>
          <p className="mx-auto mt-3 max-w-sm text-base leading-relaxed text-white/85">
            A World Cup challenge celebrating 5 years of LaFamilia — and the people building the
            Latine venture ecosystem, together.
          </p>

          {/* Social proof — the Familia is showing up */}
          <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
            <span className="inline-flex items-center gap-2 rounded-full bg-white/12 px-4 py-2 text-sm font-bold backdrop-blur">
              <PeopleIcon className="h-4 w-4 text-[var(--color-gold-soft)]" />
              {count > 0 ? `${count} of the Familia are in` : "Be the first to join in"}
            </span>
            {topPick && (
              <span className="inline-flex items-center gap-2 rounded-full bg-white/12 px-4 py-2 text-sm font-bold backdrop-blur">
                <span className="text-base leading-none">{teamFlag(topPick.code)}</span>
                Most are backing {teamName(topPick.code)} · {topPick.pct}%
              </span>
            )}
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-md px-4 pb-20 pt-6">
        {/* How the Familia plays */}
        <div className="card p-5">
          <p className="mb-4 text-xs font-bold uppercase tracking-wider text-[var(--color-muted)]">
            How the Familia plays
          </p>
          <ul className="space-y-4">
            {STEPS.map(({ Icon, text, optional, chip }) => (
              <li key={text} className="flex items-center gap-3.5">
                <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${chip}`}>
                  <Icon className="h-5 w-5" />
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

        {/* Countdown + CTA — festive, celebratory */}
        <div
          className="mt-5 rounded-3xl px-5 py-7 text-center text-white shadow-md"
          style={{ background: FIESTA }}
        >
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-white/90">
            Predictions close in
          </p>
          <div className="mt-4 flex justify-center">
            <Countdown lockTime={settings.lockTime} />
          </div>
          <Link
            href="/play"
            className="mt-7 flex min-h-[56px] w-full items-center justify-center gap-2 rounded-2xl bg-white px-6 text-lg font-bold text-[var(--color-pitch)] shadow-md transition active:scale-[0.98]"
          >
            Submit Predictions →
          </Link>
          <p className="mt-3 text-sm text-white/85">
            Already played?{" "}
            <Link href="/edit" className="font-semibold text-white underline underline-offset-4">
              Edit your picks
            </Link>
          </p>
        </div>

        {/* Leaderboard + Community Insights */}
        <div className="mt-5 grid grid-cols-2 gap-3">
          <Link
            href="/leaderboard"
            className="group flex flex-col rounded-2xl border border-[var(--color-line)] bg-white p-4 transition hover:border-[var(--color-pitch)] hover:shadow-sm"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--color-pitch)]/10 text-[var(--color-pitch)]">
              <TrendingUpIcon className="h-5 w-5" />
            </span>
            <p className="mt-3 font-bold">Leaderboard</p>
            <p className="mt-1 flex-1 text-sm text-[var(--color-muted)]">
              See who&apos;s leading the tournament
            </p>
            <ArrowRightIcon className="mt-3 h-4 w-4 text-[var(--color-muted)] transition group-hover:translate-x-0.5 group-hover:text-[var(--color-pitch)]" />
          </Link>

          <Link
            href="/insights"
            className="group flex flex-col rounded-2xl border border-[var(--color-line)] bg-white p-4 transition hover:border-[var(--color-coral)] hover:shadow-sm"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--color-coral)]/12 text-[var(--color-coral)]">
              <InsightsIcon className="h-5 w-5" />
            </span>
            <p className="mt-3 font-bold">Community Insights</p>
            <p className="mt-1 flex-1 text-sm text-[var(--color-muted)]">
              See how the community is predicting
            </p>
            <ArrowRightIcon className="mt-3 h-4 w-4 text-[var(--color-muted)] transition group-hover:translate-x-0.5 group-hover:text-[var(--color-coral)]" />
          </Link>
        </div>

        {/* Belonging — the heart of it */}
        <p className="mt-8 text-center text-base font-bold tracking-tight text-[var(--color-ink)]">
          When one of us wins, the Familia wins. 🌎
        </p>
        <p className="mt-1 text-center text-sm text-[var(--color-muted)]">
          Made by the Familia, for the Familia.
        </p>
      </section>
    </main>
  );
}
