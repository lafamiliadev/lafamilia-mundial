import Link from "next/link";
import { Countdown } from "@/components/Countdown";
import { LinkButton, PageShell, TopNav } from "@/components/ui";
import { db } from "@/lib/db";
import { getAwards } from "@/lib/services";
import { SCORING_MILESTONES } from "@/lib/schedule";
import { teamFlag } from "@/lib/teams";
import type { Award } from "@/lib/awards";

export const dynamic = "force-dynamic";
export const metadata = { title: "La Familia Honors · La Copa de LaFamilia 2026" };

function AwardCard({ a, hero = false }: { a: Award; hero?: boolean }) {
  return (
    <div
      className={
        hero
          ? "rounded-3xl p-6 text-center text-white"
          : "card p-5"
      }
      style={hero ? { background: "linear-gradient(150deg, #0a2342 0%, #123a6b 100%)" } : undefined}
    >
      <div className={hero ? "text-5xl" : "text-3xl"}>{a.emoji}</div>
      <h2 className={hero ? "mt-2 text-3xl font-black tracking-tight" : "mt-1 text-lg font-extrabold tracking-tight"}>
        {a.title}
      </h2>
      <p className={hero ? "mt-1 text-sm text-white/80" : "mt-0.5 text-sm text-[var(--color-muted)]"}>
        {a.subtitle}
      </p>
      <div className={hero ? "mt-4 space-y-2" : "mt-3 space-y-2"}>
        {a.winners.map((w) => (
          <div
            key={w.slug + w.name}
            className={
              hero
                ? "rounded-2xl bg-white/10 px-4 py-3"
                : "rounded-2xl bg-[var(--color-gold-soft)]/30 px-4 py-2.5"
            }
          >
            <p className={hero ? "text-xl font-black" : "font-bold"}>
              {teamFlag(w.rootingCountry)} {w.name}
            </p>
            <p className={hero ? "text-sm text-white/80" : "text-xs text-[var(--color-muted)]"}>{w.detail}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default async function AwardsPage() {
  const repo = await db();
  const settings = await repo.getSettings();
  const finale = SCORING_MILESTONES[SCORING_MILESTONES.length - 1];

  if (!settings.awardsRevealed) {
    return (
      <main className="flex flex-1 flex-col">
        <TopNav />
        <PageShell>
          <div className="mt-10 rounded-3xl bg-[var(--color-navy)] px-6 py-12 text-center text-white">
            <div className="text-5xl">🏆</div>
            <h1 className="mt-4 text-3xl font-black tracking-tight">La Familia Honors</h1>
            <p className="mt-3 text-white/80">
              Announced when the final whistle blows. Make your picks count.
            </p>
            <div className="mt-6 flex justify-center">
              <Countdown lockTime={finale.dateIso} />
            </div>
          </div>
          <div className="mt-6 text-center">
            <LinkButton href="/leaderboard" variant="outline" className="w-full">
              See the race →
            </LinkButton>
          </div>
        </PageShell>
      </main>
    );
  }

  const { champion, honors } = await getAwards();

  return (
    <main className="flex flex-1 flex-col">
      <TopNav />
      <PageShell>
        <div className="py-6 text-center">
          <h1 className="text-3xl font-black tracking-tight">La Familia Honors 🏆</h1>
          <p className="mt-1 text-sm text-[var(--color-muted)]">
            When one of us wins, the whole Familia wins.
          </p>
        </div>

        {champion && <AwardCard a={champion} hero />}

        {honors.length > 0 && (
          <>
            <p className="mt-7 mb-3 text-xs font-bold uppercase tracking-wider text-[var(--color-muted)]">
              The honors
            </p>
            <div className="space-y-4">
              {honors.map((a) => (
                <AwardCard key={a.id} a={a} />
              ))}
            </div>
          </>
        )}

        <p className="mt-8 text-center text-sm text-[var(--color-muted)]">
          <Link href="/leaderboard" className="underline underline-offset-4">
            Back to the final standings →
          </Link>
        </p>
      </PageShell>
    </main>
  );
}
