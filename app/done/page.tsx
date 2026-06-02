import Link from "next/link";
import { notFound } from "next/navigation";
import { ResumeLink } from "@/components/ResumeLink";
import { SavePredictionCard } from "@/components/SavePredictionCard";
import { SiembraCTA } from "@/components/Siembra";
import { Button, LinkButton } from "@/components/ui";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { teamName } from "@/lib/teams";

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
  const cardAlt = `${me.name}'s bracket — rooting for ${teamName(me.rootingCountry)}, predicting ${teamName(me.predictions.champion)} to win`;

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

      <section className="mx-auto w-full max-w-md px-4 pb-24 pt-6">
        {/* The actual shareable card — this is exactly what your crew will see */}
        <p className="mb-3 text-center text-sm font-semibold text-[var(--color-muted)]">
          Here&apos;s your card 👇 Save it and challenge the Familia.
        </p>
        <div className="overflow-hidden rounded-3xl shadow-xl ring-1 ring-black/5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={cardUrl} alt={cardAlt} width={1080} height={1350} className="w-full" />
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
