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
import { LinkButton } from "@/components/ui";
import { db } from "@/lib/db";
import { getTopChampionPick } from "@/lib/services";
import { teamFlag, teamName } from "@/lib/teams";

export const dynamic = "force-dynamic";

const SIEMBRA_URL = "https://givebutter.com/siembra-con-lafamilia-foundation";

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
    chip: "bg-[var(--color-pitch)]/10 text-[var(--color-pitch)]",
  },
];

export default async function Home() {
  const repo = await db();
  const [topPick, settings, participants] = await Promise.all([
    getTopChampionPick(),
    repo.getSettings(),
    repo.listParticipants(),
  ]);
  const count = participants.length;

  return (
    <main className="flex flex-1 flex-col">
      {/* Green hero — the full conversion area, all in one place */}
      <section className="bg-stadium px-5 pb-10 pt-14 text-center text-white">
        <div className="mx-auto max-w-md">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/lafamilia-logo-white.svg" alt="LaFamilia" className="mx-auto h-20 w-auto" />

          {/* 1 — Title */}
          <h1 className="mt-7 text-4xl font-black leading-[1.08] tracking-tight sm:text-[2.6rem]">
            La Copa de LaFamilia{" "}
            <span className="text-[var(--color-gold)]">2026</span>
            {" ⚽"}
          </h1>

          {/* 2 — Subtitle */}
          <p className="mx-auto mt-3 max-w-sm text-base leading-relaxed text-white/90">
            The World Cup challenge for the Familia behind Latine innovation.
          </p>
          <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-white/65">
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
          <div className="mt-7 rounded-2xl border border-white/15 bg-white/[0.06] px-5 py-6 backdrop-blur-sm">
            <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-[var(--color-gold-soft)]">
              Predictions close in
            </p>
            <div className="mt-3 flex justify-center">
              <Countdown lockTime={settings.lockTime} />
            </div>

            {/* 5 — Primary CTA */}
            <LinkButton href="/play" variant="gold" className="mt-6 w-full text-lg shadow-md">
              Submit Predictions →
            </LinkButton>

            {/* 6 — Secondary link */}
            <p className="mt-3 text-sm text-white/80">
              Already played?{" "}
              <Link href="/edit" className="font-semibold text-white underline underline-offset-4">
                Edit your picks
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

      {/* Below — how to play, then the deeper community story */}
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

        {/* Leaderboard + Community Insights */}
        <div className="mt-6 grid grid-cols-2 gap-3">
          <Link
            href="/leaderboard"
            className="group flex flex-col rounded-2xl border border-[var(--color-line)] bg-white p-4 transition hover:border-[var(--color-pitch)] hover:shadow-sm"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--color-pitch)]/10 text-[var(--color-pitch)]">
              <TrendingUpIcon className="h-5 w-5" />
            </span>
            <p className="mt-3 font-bold">Leaderboard</p>
            <p className="mt-1 flex-1 text-sm text-[var(--color-muted)]">
              See who&apos;s leading the Familia
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
              See how the Familia is predicting
            </p>
            <ArrowRightIcon className="mt-3 h-4 w-4 text-[var(--color-muted)] transition group-hover:translate-x-0.5 group-hover:text-[var(--color-coral)]" />
          </Link>
        </div>

        {/* Belonging — the heart of it */}
        <p className="mt-10 text-center text-lg font-extrabold tracking-tight text-[var(--color-ink)]">
          When one of us wins, the Familia wins. 🌎
        </p>
        <p className="mt-1 text-center text-sm text-[var(--color-muted)]">
          Hecho por la Familia, para la Familia.
        </p>
      </section>
    </main>
  );
}
