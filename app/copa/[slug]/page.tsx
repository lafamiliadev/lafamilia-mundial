import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { RefVisitPing } from "@/components/RefVisitPing";
import { SiembraCTA } from "@/components/Siembra";
import { Button, LinkButton } from "@/components/ui";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { now } from "@/lib/preview";
import { relativeLockLabel } from "@/lib/schedule";
import { getLeaderboardData } from "@/lib/services";
import { teamName } from "@/lib/teams";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const repo = await db();
  const me = await repo.getBySlug(slug);
  if (!me) return { title: "La Copa de LaFamilia 2026" };
  const title = `${me.name} picked ${teamName(me.predictions.champion)} to win · La Copa de LaFamilia 2026`;
  const description = `See ${me.name.split(" ")[0]}'s World Cup bracket and add your own — takes a few minutes.`;
  const image = `${env.NEXT_PUBLIC_APP_URL}/api/card/${me.slug}`;
  const pageUrl = `${env.NEXT_PUBLIC_APP_URL}/copa/${me.slug}`;
  const alt = `${me.name}'s World Cup bracket — ${teamName(me.predictions.champion)} to win`;
  return {
    metadataBase: new URL(env.NEXT_PUBLIC_APP_URL),
    title,
    description,
    openGraph: {
      type: "website",
      url: pageUrl,
      siteName: "La Copa de LaFamilia 2026",
      title,
      description,
      images: [{ url: image, width: 1080, height: 1350, alt }],
    },
    twitter: { card: "summary_large_image", title, description, images: [image] },
  };
}

export default async function CopaPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const repo = await db();
  const me = await repo.getBySlug(slug);
  if (!me) notFound();

  const firstName = me.name.split(" ")[0];
  const cardUrl = `/api/card/${me.slug}`;
  const playHref = `/play?ref=${me.slug}`;

  // Live context — so a friend landing here instantly feels the game is active:
  // how many are in, how long they have, and where the friend stands.
  const [count, settings, board, scores] = await Promise.all([
    repo.countParticipants(),
    repo.getSettings(),
    getLeaderboardData(),
    repo.getScores(),
  ]);
  const myScore = scores[me.id];
  // Points so far, broken out by how they were earned — shown once the player
  // has any points, so a visitor sees the full picture (not just the bracket).
  const scoreSlices =
    board.scoringStarted && myScore && myScore.total > 0
      ? ([
          { label: "Bracket", value: myScore.bracket },
          { label: "Score predictions", value: myScore.scorePick },
          { label: "Knockouts", value: myScore.live },
          { label: "Bonus picks", value: myScore.bonus },
        ].filter((s) => s.value > 0) as { label: string; value: number }[])
      : [];
  const lockMs = new Date(settings.lockTime).getTime();
  const locked = (await now()).getTime() >= lockMs;
  const lockLabel = relativeLockLabel(lockMs - (await now()).getTime());
  // Only show a real rank once points exist — pre-tournament ranks are arbitrary.
  const ownerRank = board.scoringStarted
    ? (board.all.find((r) => r.slug === me.slug)?.rank ?? null)
    : null;

  const competitionLine = locked
    ? "Predictions are locked — follow the race on the leaderboard."
    : ownerRank
      ? `${firstName} is currently #${ownerRank} in the Familia. Think you can catch them?`
      : `${firstName} is already in. Add your card and you're on the board.`;

  return (
    <main className="flex flex-1 flex-col">
      <RefVisitPing slug={me.slug} />

      {/* Warm, community-first header */}
      <section
        className="px-5 pb-7 pt-12 text-center text-white"
        style={{ background: "linear-gradient(160deg, #ff2d6f 0%, #ff6b1a 55%, #ffb627 100%)" }}
      >
        <div className="mx-auto max-w-md">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/lafamilia-logo-white.svg" alt="LaFamilia" className="mx-auto h-9 w-auto" />
          <div className="mt-5 inline-flex items-center gap-2 rounded-full bg-black/15 px-3 py-1 text-xs font-bold uppercase tracking-wider backdrop-blur">
            ⚽ {firstName} invited you
          </div>
          <h1 className="mt-4 text-3xl font-black leading-tight tracking-tight">
            La Copa de LaFamilia 2026
          </h1>
          {/* Live status — calm awareness that this is active right now, not a banner. */}
          <div className="mt-3 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-sm font-semibold text-white/90">
            <span className="inline-flex items-center gap-1.5">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#4ade80] opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-[#4ade80]" />
              </span>
              {count} {count === 1 ? "person" : "people"} playing
            </span>
            {!locked && (
              <>
                <span className="text-white/40">·</span>
                <span>Picks lock {lockLabel}</span>
              </>
            )}
          </div>
          <p className="mt-3 text-white/90">See {firstName}&apos;s picks — then add your own.</p>
        </div>
      </section>

      <section className="mx-auto w-full max-w-md px-4 pb-24 pt-6">
        {/* Branded prediction card */}
        <div className="overflow-hidden rounded-3xl shadow-xl ring-1 ring-black/5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={cardUrl}
            alt={`${me.name}'s bracket — rooting for ${teamName(me.rootingCountry)}, predicting ${teamName(me.predictions.champion)} to win`}
            width={1080}
            height={1350}
            className="w-full"
          />
        </div>

        {/* Points so far — broken out by how they were earned */}
        {scoreSlices.length > 0 && myScore && (
          <div className="mt-6 card p-5 text-center">
            <p className="text-xs font-bold uppercase tracking-wider text-[var(--color-muted)]">
              {firstName}&apos;s points so far
            </p>
            <p className="mt-1 text-4xl font-black tabular-nums">{myScore.total}</p>
            <div className="mt-3 flex flex-wrap justify-center gap-2">
              {scoreSlices.map((s) => (
                <span
                  key={s.label}
                  className="rounded-full bg-[var(--color-cream)] px-3 py-1 text-xs font-semibold"
                >
                  {s.label} <strong className="tabular-nums">{s.value}</strong>
                </span>
              ))}
            </div>
          </div>
        )}

        {/* CTA — join the game, with a friendly nudge about where the friend stands */}
        <div className="mt-6">
          <p className="mb-3 text-center text-sm font-semibold leading-snug">
            {competitionLine}
          </p>
          {locked ? (
            <LinkButton href="/leaderboard" variant="gold" className="w-full text-lg shadow-md">
              See the Leaderboard 🏆
            </LinkButton>
          ) : (
            <>
              <LinkButton href={playHref} variant="gold" className="w-full text-lg shadow-md">
                Add Your Prediction ⚽
              </LinkButton>
              <p className="mt-2 text-center text-xs text-[var(--color-muted)]">
                Make your picks in a few minutes — no password needed.
              </p>
            </>
          )}
        </div>

        {/* What's LaFamilia — brief intro + community invite */}
        <div className="mt-8 card p-5 text-center">
          <p className="text-base font-extrabold tracking-tight">What&apos;s LaFamilia? 🌎</p>
          <p className="mt-2 text-sm leading-relaxed text-[var(--color-muted)]">
            The largest Latine venture community. Founders, investors, and operators who actually
            show up for each other. La Copa is just us having fun with it.
          </p>
          <a
            href="https://nas.io/lafamilia-foundation"
            target="_blank"
            rel="noreferrer"
            className="block"
          >
            <Button variant="primary" className="mt-4 w-full">
              🤝 Join the familia
            </Button>
          </a>
        </div>

        {/* Siembra — a warm, optional way to support */}
        <div className="mt-6">
          <SiembraCTA />
        </div>

        <p className="mt-6 text-center text-xs text-[var(--color-muted)]">
          La Copa de LaFamilia 2026 · A community game. Not betting — just bragging rights. 🎉
        </p>
      </section>
    </main>
  );
}
