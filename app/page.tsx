import Link from "next/link";
import { Countdown } from "@/components/Countdown";
import { LinkButton } from "@/components/ui";
import { db } from "@/lib/db";
import { getParticipantCount, getTopChampionPick } from "@/lib/services";
import { teamFlag, teamName } from "@/lib/teams";

export const dynamic = "force-dynamic";

export default async function Home() {
  const repo = await db();
  const [count, topPick, settings] = await Promise.all([
    getParticipantCount(),
    getTopChampionPick(),
    repo.getSettings(),
  ]);

  return (
    <main className="flex flex-1 flex-col">
      {/* Hero */}
      <section className="bg-stadium px-5 pb-10 pt-14 text-white">
        <div className="mx-auto max-w-md">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold backdrop-blur">
            🌎 Canada · México · USA 2026
          </div>
          <h1 className="text-[2.6rem] font-black leading-[1.05] tracking-tight">
            LaFamilia
            <br />
            Mundial <span className="text-[var(--color-gold)]">2026</span> ⚽
          </h1>
          <p className="mt-4 max-w-sm text-lg text-white/85">
            Predict the tournament. Compete with the community. See who becomes
            LaFamilia&apos;s top predictor.
          </p>

          <div className="mt-7">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-white/60">
              Predictions lock at kickoff
            </p>
            <Countdown lockTime={settings.lockTime} />
          </div>

          <div className="mt-8 flex flex-col gap-3">
            <LinkButton href="/play" variant="gold" className="w-full text-lg">
              Submit Predictions →
            </LinkButton>
            <div className="flex items-center justify-center gap-4 text-sm text-white/80">
              <Link href="/leaderboard" className="underline-offset-4 hover:underline">
                Leaderboard
              </Link>
              <span className="opacity-40">·</span>
              <Link href="/insights" className="underline-offset-4 hover:underline">
                Community insights
              </Link>
            </div>
          </div>

          {/* Social proof */}
          <div className="mt-8 flex flex-wrap items-center gap-2 text-sm">
            {count > 0 ? (
              <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 font-semibold backdrop-blur">
                🙌 {count} {count === 1 ? "member has" : "of Familia have"} predicted
              </span>
            ) : (
              <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 font-semibold backdrop-blur">
                ✨ Be the first to predict
              </span>
            )}
            {topPick && (
              <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 font-semibold backdrop-blur">
                {teamFlag(topPick.code)} Most pick {teamName(topPick.code)} · {topPick.pct}%
              </span>
            )}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="mx-auto w-full max-w-md px-5 py-10">
        <h2 className="text-sm font-bold uppercase tracking-wider text-[var(--color-muted)]">
          Takes under 2 minutes
        </h2>
        <ul className="mt-4 space-y-3">
          {[
            { e: "🏆", t: "Pick the champion & runner-up", d: "Tap a flag — no soccer expertise needed." },
            { e: "🔥", t: "Call the dark horse & Golden Boot", d: "Who surprises everyone? Who scores the most?" },
            { e: "📊", t: "Climb the leaderboard", d: "Earn points as the tournament unfolds." },
          ].map((s) => (
            <li key={s.t} className="card flex items-start gap-4 p-4">
              <span className="text-2xl">{s.e}</span>
              <div>
                <p className="font-bold">{s.t}</p>
                <p className="text-sm text-[var(--color-muted)]">{s.d}</p>
              </div>
            </li>
          ))}
        </ul>

        <div className="mt-8">
          <LinkButton href="/play" variant="primary" className="w-full">
            Start predicting →
          </LinkButton>
        </div>

        <p className="mt-6 text-center text-xs text-[var(--color-muted)]">
          A community game by LaFamilia. Not betting — just bragging rights. 🎉
        </p>
      </section>
    </main>
  );
}
