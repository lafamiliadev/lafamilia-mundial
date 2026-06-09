import { Countdown } from "@/components/Countdown";
import { AwardCard } from "@/components/AwardCard";
import { LinkButton, PageShell, TopNav } from "@/components/ui";
import { db } from "@/lib/db";
import { getAwards } from "@/lib/services";
import { AWARD_CATALOG, AWARD_GROUPS, type Award } from "@/lib/awards";
import { SCORING_MILESTONES } from "@/lib/schedule";

export const dynamic = "force-dynamic";
export const metadata = { title: "La Familia Honors · La Copa de LaFamilia 2026" };

export default async function AwardsPage() {
  const repo = await db();
  const settings = await repo.getSettings();
  const { champion, honors } = await getAwards();
  const revealed = settings.awardsRevealed ?? false;

  // Winner lookup. La Copa is the finale — only reveal its winner once the admin
  // flips "Reveal honors"; every other category lights up as it resolves.
  const all = [champion, ...honors].filter(Boolean) as Award[];
  const winnerById = new Map(all.map((a) => [a.id, a]));
  const winnerFor = (id: string): Award | null => {
    if (id === "lacopa" && !revealed) return null;
    return winnerById.get(id) ?? null;
  };

  const awarded = AWARD_CATALOG.filter((e) => winnerFor(e.id)).length;
  const nextLocked = AWARD_CATALOG.filter((e) => !winnerFor(e.id)).sort(
    (a, b) => a.unlockOrder - b.unlockOrder,
  )[0];
  const finale = SCORING_MILESTONES[SCORING_MILESTONES.length - 1];
  const pct = Math.round((awarded / AWARD_CATALOG.length) * 100);

  return (
    <main className="flex flex-1 flex-col">
      <TopNav />
      <PageShell>
        {/* Hero */}
        <section
          className="mt-4 overflow-hidden rounded-3xl px-6 py-9 text-center text-white"
          style={{ background: "linear-gradient(150deg,#0a2342 0%,#123a6b 55%,#1a5e3a 100%)" }}
        >
          <div className="text-5xl">🏆</div>
          <h1 className="mt-2 text-3xl font-black tracking-tight">La Familia Honors</h1>
          <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-white/85">
            {AWARD_CATALOG.length} ways to make history this World Cup. Some are already in play —
            the rest unlock as the tournament unfolds. When one of us wins, the whole Familia wins.
          </p>

          <div className="mx-auto mt-5 max-w-xs">
            <div className="flex items-center justify-between text-xs font-semibold text-white/80">
              <span>
                {awarded} of {AWARD_CATALOG.length} awarded
              </span>
              {nextLocked && <span>Next up: {nextLocked.name}</span>}
            </div>
            <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-white/15">
              <div className="h-full rounded-full bg-[var(--color-gold)]" style={{ width: `${pct}%` }} />
            </div>
            {!revealed && (
              <div className="mt-5">
                <p className="text-xs text-white/70">🏆 La Copa is crowned in</p>
                <div className="mt-2 flex justify-center">
                  <Countdown
                    lockTime={finale.dateIso}
                    doneLabel="🏆 The final whistle blew — the champion is coming."
                  />
                </div>
              </div>
            )}
          </div>
        </section>

        {/* The Hall of Honors — grouped */}
        {AWARD_GROUPS.map((g) => {
          const entries = AWARD_CATALOG.filter((e) => e.group === g.key);
          if (entries.length === 0) return null;
          return (
            <section key={g.key} className="mt-8">
              <div className="mb-3">
                <h2 className="flex items-center gap-2 text-xl font-extrabold tracking-tight">
                  <span aria-hidden>{g.emoji}</span> {g.title}
                </h2>
                <p className="text-sm text-[var(--color-muted)]">{g.blurb}</p>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {entries.map((e) => (
                  <AwardCard key={e.id} entry={e} winner={winnerFor(e.id)} />
                ))}
              </div>
            </section>
          );
        })}

        <div className="mt-9 mb-4 text-center">
          <LinkButton href="/leaderboard" variant="outline" className="w-full">
            See the race for these honors →
          </LinkButton>
        </div>
      </PageShell>
    </main>
  );
}
