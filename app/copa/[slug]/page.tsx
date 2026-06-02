import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { RefVisitPing } from "@/components/RefVisitPing";
import { SiembraCTA } from "@/components/Siembra";
import { LinkButton } from "@/components/ui";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { getLeaderboardData, getReferralStats } from "@/lib/services";
import { teamFlag, teamName } from "@/lib/teams";

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
  const description = `Can you beat ${me.name.split(" ")[0]}'s bracket? Predict the World Cup with LaFamilia — takes under 2 minutes.`;
  const image = `${env.NEXT_PUBLIC_APP_URL}/api/card/${me.slug}`;
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: [{ url: image, width: 1080, height: 1350 }],
    },
    twitter: { card: "summary_large_image", title, description, images: [image] },
  };
}

const medal = (rank: number) => (rank === 1 ? "🥇" : rank === 2 ? "🥈" : rank === 3 ? "🥉" : `${rank}`);

export default async function CopaPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const repo = await db();
  const me = await repo.getBySlug(slug);
  if (!me) notFound();

  const [{ total, top }, refStats] = await Promise.all([
    getLeaderboardData(null, 5),
    getReferralStats(slug),
  ]);

  const firstName = me.name.split(" ")[0];
  const cardUrl = `/api/card/${me.slug}`;
  const playHref = `/play?ref=${me.slug}`;

  return (
    <main className="flex flex-1 flex-col">
      <RefVisitPing slug={me.slug} />

      {/* Invite hero */}
      <section
        className="px-5 pb-8 pt-12 text-center text-white"
        style={{ background: "linear-gradient(160deg, #ff2d6f 0%, #ff6b1a 55%, #ffb627 100%)" }}
      >
        <div className="mx-auto max-w-md">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/lafamilia-logo-white.svg" alt="LaFamilia" className="mx-auto h-9 w-auto" />
          <div className="mt-5 inline-flex items-center gap-2 rounded-full bg-black/15 px-3 py-1 text-xs font-bold uppercase tracking-wider backdrop-blur">
            ⚽ Invited by {firstName}
          </div>
          <h1 className="mt-4 text-[2.1rem] font-black leading-[1.08] tracking-tight">
            {firstName} thinks their bracket is unbeatable.
          </h1>
          <p className="mt-3 text-lg text-white/90">Prove them wrong? 👀</p>
        </div>
      </section>

      <section className="mx-auto w-full max-w-md px-4 pb-24 pt-6">
        {/* Their card */}
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

        {/* Primary CTA — make your own */}
        <div className="mt-6">
          <LinkButton href={playHref} variant="gold" className="w-full text-lg shadow-md">
            ⚽ Can you beat my bracket? Play →
          </LinkButton>
          <p className="mt-2 text-center text-xs text-[var(--color-muted)]">
            Make your own predictions in under 2 minutes — no password needed.
          </p>
        </div>

        {/* Referral social proof */}
        {refStats.signups > 0 && (
          <p className="mt-5 text-center text-sm font-semibold text-[var(--color-pitch)]">
            🙌 {refStats.signups} {refStats.signups === 1 ? "person has" : "people have"} joined through {firstName}&apos;s link
          </p>
        )}

        {/* Leaderboard preview */}
        {total > 0 && (
          <div className="card mt-6 overflow-hidden">
            <div className="flex items-center justify-between bg-black/[0.03] px-4 py-2.5">
              <span className="text-xs font-bold uppercase tracking-wider text-[var(--color-muted)]">
                🏆 Leaderboard
              </span>
              <span className="text-xs font-semibold text-[var(--color-muted)]">
                {total} {total === 1 ? "player" : "players"}
              </span>
            </div>
            <div className="divide-y divide-[var(--color-line)]">
              {top.map((r) => (
                <div key={`${r.rank}-${r.name}`} className="flex items-center gap-3 px-4 py-2.5">
                  <span className="w-7 text-center text-base font-black tabular-nums">{medal(r.rank)}</span>
                  <span className="flex-1 truncate font-semibold">{r.name}</span>
                  <span className="text-lg leading-none">{teamFlag(r.rootingCountry)}</span>
                  <span className="w-12 text-right font-black tabular-nums">{r.total}</span>
                </div>
              ))}
            </div>
            <Link
              href="/leaderboard"
              className="block px-4 py-3 text-center text-sm font-semibold text-[var(--color-pitch)] hover:bg-black/[0.02]"
            >
              See the full leaderboard →
            </Link>
          </div>
        )}

        {/* Siembra — arrives via a trusted community member, not a cold ask */}
        <div className="mt-8">
          <SiembraCTA />
        </div>

        <p className="mt-6 text-center text-xs text-[var(--color-muted)]">
          La Copa de LaFamilia 2026 · A community game. Not betting — just bragging rights. 🎉
        </p>
      </section>
    </main>
  );
}
