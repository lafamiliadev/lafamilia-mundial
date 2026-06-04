import Link from "next/link";
import { redirect } from "next/navigation";
import { BonusWizard } from "@/components/BonusWizard";
import { LinkButton } from "@/components/ui";
import { db } from "@/lib/db";
import { getSessionParticipant } from "@/lib/session";
import { EMPTY_BONUS } from "@/lib/types";

export const dynamic = "force-dynamic";
export const metadata = { title: "Bonus Picks · La Copa de LaFamilia 2026" };

export default async function BonusPicksPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  const repo = await db();
  const me = token ? await repo.getByToken(token) : await getSessionParticipant();

  // No entry yet → the bracket comes first.
  if (!me) {
    return (
      <main className="mx-auto flex min-h-[70vh] w-full max-w-md flex-col items-center justify-center gap-4 px-6 text-center">
        <div className="text-5xl">🏆</div>
        <h1 className="text-2xl font-extrabold tracking-tight">First, your bracket</h1>
        <p className="text-[var(--color-muted)]">
          Bonus Picks ride on top of your bracket. Make your 3-minute bracket first, then add them.
        </p>
        <LinkButton href="/play" variant="primary" className="w-full">
          Make my bracket →
        </LinkButton>
        <Link href="/edit" className="text-sm font-semibold underline underline-offset-4">
          Already played? Find my picks
        </Link>
      </main>
    );
  }

  const settings = await repo.getSettings();
  const locked = Date.now() >= new Date(settings.lockTime).getTime();
  if (locked) {
    // After kickoff Bonus Picks freeze — send them to the hub to see status.
    redirect("/picks");
  }

  return (
    <main className="flex flex-1 flex-col">
      <BonusWizard
        token={me.resumeToken}
        initial={me.predictions.bonus ?? EMPTY_BONUS}
        weights={{
          goldenBall: settings.weights.goldenBall,
          goldenBoot: settings.weights.goldenBoot,
          goldenGlove: settings.weights.goldenGlove,
          darkHorseSf: settings.weights.darkHorseSf,
        }}
      />
    </main>
  );
}
