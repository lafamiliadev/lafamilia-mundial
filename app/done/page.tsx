import Link from "next/link";
import { notFound } from "next/navigation";
import { ResumeLink } from "@/components/ResumeLink";
import { SavePredictionCard } from "@/components/SavePredictionCard";
import { SiembraCTA } from "@/components/Siembra";
import { Button, LinkButton } from "@/components/ui";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { playerName } from "@/lib/players";
import { teamFlag, teamName } from "@/lib/teams";

export const dynamic = "force-dynamic";
export const metadata = { title: "You're in! · La Copa de LaFamilia 2026" };

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
  const cardUrl = `/api/card/${me.resumeToken}`;
  // Share the public app link (so friends make THEIR OWN bracket), not the private edit link.
  const referralUrl = env.NEXT_PUBLIC_APP_URL;
  const shareText = `I just made my La Copa de LaFamilia 2026 predictions ⚽🌎\n\nCan your bracket beat mine?\n\nSubmit yours here:`;
  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(`${shareText} ${referralUrl}`)}`;
  const cardFile = `la-copa-lafamilia-${me.name.split(" ")[0].toLowerCase()}.png`;

  const summary = [
    { label: "Rooting for", value: `${teamFlag(me.rootingCountry)} ${teamName(me.rootingCountry)}` },
    { label: "Predicting to win", value: `${teamFlag(me.predictions.champion)} ${teamName(me.predictions.champion)}` },
    { label: "Runner-up", value: `${teamFlag(me.predictions.runnerUp)} ${teamName(me.predictions.runnerUp)}` },
    { label: "Golden Boot", value: playerName(me.predictions.goldenBoot) },
    { label: "Dark horse", value: `${teamFlag(me.predictions.darkHorse)} ${teamName(me.predictions.darkHorse)}` },
    { label: "LatAm furthest", value: `${teamFlag(me.predictions.latamFurthest)} ${teamName(me.predictions.latamFurthest)}` },
  ];

  return (
    <main className="flex flex-1 flex-col">
      <section className="bg-stadium px-5 pb-8 pt-12 text-center text-white">
        <div className="mx-auto max-w-md">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/lafamilia-logo-white.svg" alt="LaFamilia" className="mx-auto h-10 w-auto" />
          <div className="mt-5 text-5xl">🎉</div>
          <h1 className="mt-3 text-3xl font-black tracking-tight">You&apos;re in, {me.name.split(" ")[0]}!</h1>
          <p className="mt-2 text-white/85">
            Your bracket is locked in. Now bring the Familia — share your card and challenge your crew.
          </p>
        </div>
      </section>

      <section className="mx-auto -mt-6 w-full max-w-md px-4 pb-24">
        {/* Bracket summary — fiesta header for branding, clean list for scanning */}
        <div className="card overflow-hidden">
          <div
            className="p-5 text-white"
            style={{ background: "linear-gradient(135deg, #ff2d6f 0%, #ff6b1a 55%, #ffb627 100%)" }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/lafamilia-logo-white.svg" alt="LaFamilia" className="h-7 w-auto" />
            <p className="mt-3 text-xs font-bold uppercase tracking-wider text-white/85">
              La Copa de LaFamilia 2026 ⚽
            </p>
            <p className="mt-3 text-sm text-white/90">{me.name}&apos;s pick to win it all</p>
            <p className="mt-1 text-4xl font-black drop-shadow-sm">
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

        {/* Action hierarchy: Save Card → WhatsApp → Leaderboard / Edit */}
        <div className="mt-6 space-y-3">
          <SavePredictionCard
            cardUrl={cardUrl}
            fileName={cardFile}
            shareText={`I just made my La Copa de LaFamilia 2026 predictions ⚽🌎 Can your bracket beat mine?`}
            shareUrl={referralUrl}
          />

          <a href={whatsappUrl} target="_blank" rel="noreferrer" className="block">
            <Button variant="primary" className="w-full">
              📲 Share on WhatsApp
            </Button>
          </a>

          <div className="grid grid-cols-2 gap-3">
            <LinkButton href={`/leaderboard?me=${me.resumeToken}`} variant="outline" className="w-full">
              🏆 Leaderboard
            </LinkButton>
            <LinkButton href={`/r/${me.resumeToken}`} variant="outline" className="w-full">
              ✏️ Edit picks
            </LinkButton>
          </div>
        </div>

        {/* Siembra mission CTA — below the summary + share actions */}
        <div className="mt-8">
          <SiembraCTA />
        </div>

        {/* Private return link — available, but no longer a primary CTA */}
        <div className="mt-6">
          <ResumeLink url={resumeUrl} />
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
