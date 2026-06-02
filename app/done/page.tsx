import Link from "next/link";
import { notFound } from "next/navigation";
import { ShareActions } from "@/components/ShareActions";
import { LinkButton } from "@/components/ui";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { playerName } from "@/lib/players";
import { teamFlag, teamName } from "@/lib/teams";

export const dynamic = "force-dynamic";
export const metadata = { title: "You're in! · LaFamilia Mundial 2026" };

export default async function DonePage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  if (!token) notFound();

  const repo = await db();
  const me = await repo.getByToken(token);
  if (!me) notFound();

  const resumeUrl = `${env.NEXT_PUBLIC_APP_URL}/r/${me.resumeToken}`;
  const shareText = `I just made my LaFamilia Mundial 2026 predictions — I've got ${teamFlag(
    me.predictions.champion,
  )} ${teamName(me.predictions.champion)} winning it all. Beat my bracket! ⚽🌎`;

  const summary = [
    { label: "Champion", value: `${teamFlag(me.predictions.champion)} ${teamName(me.predictions.champion)}` },
    { label: "Runner-up", value: `${teamFlag(me.predictions.runnerUp)} ${teamName(me.predictions.runnerUp)}` },
    { label: "Golden Boot", value: playerName(me.predictions.goldenBoot) },
    { label: "Dark horse", value: `${teamFlag(me.predictions.darkHorse)} ${teamName(me.predictions.darkHorse)}` },
    { label: "LatAm furthest", value: `${teamFlag(me.predictions.latamFurthest)} ${teamName(me.predictions.latamFurthest)}` },
  ];

  return (
    <main className="flex flex-1 flex-col">
      <section className="bg-stadium px-5 pb-8 pt-14 text-center text-white">
        <div className="mx-auto max-w-md">
          <div className="text-5xl">🎉</div>
          <h1 className="mt-3 text-3xl font-black tracking-tight">You&apos;re in, {me.name.split(" ")[0]}!</h1>
          <p className="mt-2 text-white/85">
            Your bracket is locked in. Now bring the Familia — challenge your crew to beat it.
          </p>
        </div>
      </section>

      <section className="mx-auto -mt-6 w-full max-w-md px-4 pb-24">
        {/* Share card preview (matches the OG image) */}
        <div className="card overflow-hidden">
          <div
            className="bg-stadium p-5 text-white"
            style={{ backgroundColor: "var(--color-pitch)" }}
          >
            <p className="text-xs font-semibold uppercase tracking-wider text-white/70">
              LaFamilia Mundial 2026
            </p>
            <p className="mt-3 text-sm text-white/80">{me.name}&apos;s pick to win it all</p>
            <p className="mt-1 text-4xl font-black">
              {teamFlag(me.predictions.champion)} {teamName(me.predictions.champion)}
            </p>
          </div>
          <div className="divide-y divide-[var(--color-line)]">
            {summary.map((row) => (
              <div key={row.label} className="flex items-center justify-between px-4 py-3">
                <span className="text-sm text-[var(--color-muted)]">{row.label}</span>
                <span className="font-semibold">{row.value}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-6">
          <ShareActions resumeUrl={resumeUrl} shareText={shareText} />
        </div>

        <div className="mt-4 rounded-2xl bg-[var(--color-gold-soft)]/50 px-4 py-3 text-sm">
          <p className="font-semibold">🔖 Save your private link</p>
          <p className="mt-0.5 text-[var(--color-muted)]">
            Bookmark it to return, edit your picks before kickoff, and track your rank:
          </p>
          <p className="mt-1 break-all font-mono text-xs text-[var(--color-pitch)]">{resumeUrl}</p>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3">
          <LinkButton href="/leaderboard" variant="primary" className="w-full">
            🏆 Leaderboard
          </LinkButton>
          <LinkButton href={`/r/${me.resumeToken}`} variant="outline" className="w-full">
            ✏️ Edit picks
          </LinkButton>
        </div>

        <p className="mt-6 text-center text-sm text-[var(--color-muted)]">
          <Link href="/insights" className="underline underline-offset-4">
            See what the rest of Familia predicted →
          </Link>
        </p>
      </section>
    </main>
  );
}
