import { notFound } from "next/navigation";
import { CopyShareLink } from "@/components/CopyShareLink";
import { ResumeLink } from "@/components/ResumeLink";
import { SavePredictionCard } from "@/components/SavePredictionCard";
import { SiembraCTA } from "@/components/Siembra";
import { Button, TopNav } from "@/components/ui";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
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
  const cardUrl = `/api/card/${me.slug}`;
  // Personalized public share page — friends land here, see the card, and make
  // their own bracket (attributed back via ?ref). This is the viral loop.
  const copaUrl = `${env.NEXT_PUBLIC_APP_URL}/copa/${me.slug}`;
  const firstName = me.name.split(" ")[0];
  const finalFour = me.predictions.semifinalists ?? [];
  const shareMessage = `My Final Four 🔥 ${finalFour.map((c) => teamFlag(c)).join(" ")} — and ${teamName(me.predictions.champion)} to lift it. 🏆

La Copa de LaFamilia is a little World Cup challenge from LaFamilia, the largest Latine venture community, in support of Siembra. When one of us gets in the room, we open the door for the next.

Think you can beat my bracket? 👇`;
  const communityLine = `🤝 Join the familia: https://nas.io/lafamilia-foundation`;
  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(`${shareMessage}\n\n${copaUrl}\n\n${communityLine}`)}`;
  const cardFile = `la-copa-lafamilia-${me.name.split(" ")[0].toLowerCase()}.png`;

  return (
    <main className="flex flex-1 flex-col">
      <TopNav active="picks" />

      {/* Success + card framing — green extends a little past the text so the
          collectible card can overlap it and feel like it floats. */}
      <section className="bg-stadium px-5 pb-16 pt-9 text-center text-white">
        <div className="mx-auto max-w-md">
          <div className="text-5xl">🎉</div>
          <h1 className="mt-2 text-3xl font-black tracking-tight">You&apos;re in, {firstName}!</h1>
          <p className="mt-4 text-lg font-extrabold tracking-tight text-[var(--color-gold-soft)]">
            🏆 Your Collectible Prediction Card
          </p>
          <p className="mx-auto mt-1.5 max-w-xs text-sm leading-relaxed text-white/85">
            Save it, share it, and see if anyone in the Familia can beat your picks.
          </p>
        </div>
      </section>

      <section className="relative z-10 mx-auto -mt-10 w-full max-w-md px-4 pb-24">
        {/* ── The collectible card — hero, floating over the hero boundary ── */}
        <div className="overflow-hidden rounded-3xl shadow-2xl ring-1 ring-black/5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={cardUrl}
            alt={`${me.name}'s World Cup bracket — ${teamName(me.predictions.champion)} to win`}
            width={1080}
            height={1350}
            className="w-full"
          />
        </div>

        {/* ── Share — one clear primary action, then side-by-side secondaries ── */}
        <div className="mt-7 space-y-3">
          <a href={whatsappUrl} target="_blank" rel="noreferrer" className="block">
            <Button variant="primary" className="w-full py-5 text-lg shadow-md">
              📲 Share on WhatsApp
            </Button>
          </a>
          <p className="text-center text-xs text-[var(--color-muted)]">
            Challenge 3 Familia members to beat your picks.
          </p>
          <div className="grid grid-cols-2 gap-3">
            <CopyShareLink url={copaUrl} text={shareMessage} />
            <SavePredictionCard
              cardUrl={cardUrl}
              fileName={cardFile}
              shareText={shareMessage}
              shareUrl={copaUrl}
              secondary
              idleLabel="📥 Download Card"
            />
          </div>
        </div>

        {/* ── Background — mission + private return link ── */}
        <div className="mt-8">
          <SiembraCTA />
        </div>
        <div className="mt-6">
          <ResumeLink url={resumeUrl} />
        </div>
      </section>
    </main>
  );
}
