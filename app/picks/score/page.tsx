import { notFound } from "next/navigation";
import { PageShell, TopNav } from "@/components/ui";
import { db } from "@/lib/db";
import { getSessionParticipant } from "@/lib/session";
import { now } from "@/lib/preview";
import { ScoreForm } from "./ScoreForm";
import type { ScoreMatch } from "@/lib/types";

export const dynamic = "force-dynamic";
export const metadata = { title: "Predict the Score · La Copa de LaFamilia 2026" };

function MatchCard({ match, isToday }: { match: ScoreMatch; isToday: boolean }) {
  return (
    <div className="card overflow-hidden">
      <div className="bg-[var(--color-pitch)] px-4 py-2 text-center">
        <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--color-gold-soft)]">
          LatAm + Spain · {isToday ? "Today's match" : "Score prediction"}
        </span>
      </div>
      <div className="px-5 py-4 text-center">
        <h2 className="text-lg font-extrabold text-[var(--color-ink)]">
          {match.teamA} vs {match.teamB}
        </h2>
        <p className="mt-1 text-sm text-[var(--color-muted)]">
          Kickoff: {match.displayTimePt} / {match.displayTimeEt.split(", ").slice(-1)[0]}
        </p>
      </div>
    </div>
  );
}

export default async function ScorePredictionPage() {
  const repo = await db();
  const me = await getSessionParticipant();
  const nowD = await now();
  const nowIso = nowD.toISOString();

  // Show all upcoming matches in the next 24 hours, or the next single match if
  // there's nothing today. For now, drive from "upcoming within 24 hours".
  const upcoming = await repo.getUpcomingScoreMatches(nowIso, 24);

  // If nothing upcoming, show the last kicked-off match (locked state) as a fallback.
  let matches: ScoreMatch[] = upcoming;
  if (matches.length === 0) {
    // Find the most recent match that kicked off but hasn't been scored yet.
    const all = await repo.getScoreMatches();
    const recent = all
      .filter((m) => m.kickoffUtc <= nowIso && m.finalScoreA == null)
      .slice(-1);
    if (recent.length > 0) matches = recent;
  }

  if (matches.length === 0) {
    return (
      <main className="flex flex-1 flex-col">
        <TopNav active="picks" />
        <PageShell>
          <div className="card mt-10 p-8 text-center">
            <div className="text-5xl">⚽</div>
            <h1 className="mt-3 text-xl font-extrabold tracking-tight">No score to predict right now</h1>
            <p className="mt-2 text-sm text-[var(--color-muted)]">
              Check back when the next eligible match is coming up.
            </p>
          </div>
        </PageShell>
      </main>
    );
  }

  // Fetch all user predictions in one batch (or null if not logged in).
  const predictions = me
    ? await Promise.all(matches.map((m) => repo.getScorePrediction(me.id, m.matchId)))
    : matches.map(() => null);

  const todayStr = nowD.toISOString().slice(0, 10);

  return (
    <main className="flex flex-1 flex-col">
      <TopNav active="picks" />
      <PageShell>
        <div className="py-6">
          <p className="text-xs font-bold uppercase tracking-wider text-[var(--color-muted)]">
            LatAm + Spain matches
          </p>
          <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-[var(--color-ink)]">
            Predict the final score
          </h1>
          <p className="mt-1 text-sm text-[var(--color-muted)]">
            Lock your score before kickoff and earn points if you call it right.
          </p>
        </div>

        {!me && (
          <div className="mb-5 rounded-2xl border border-[var(--color-line)] bg-[var(--color-cream)] p-4 text-center text-sm">
            <p className="font-semibold text-[var(--color-ink)]">
              You need a bracket to make score picks.
            </p>
            <a href="/play" className="mt-2 inline-block font-bold text-[var(--color-pitch)] underline underline-offset-4">
              Make my bracket →
            </a>
          </div>
        )}

        <div className="space-y-8">
          {matches.map((match, i) => {
            const isToday = match.kickoffUtc.slice(0, 10) === todayStr;
            const isLocked = nowD.getTime() >= new Date(match.kickoffUtc).getTime();
            const existing = predictions[i];

            return (
              <div key={match.matchId} className="space-y-4">
                <MatchCard match={match} isToday={isToday} />
                <ScoreForm match={match} existing={existing} isLocked={isLocked} />
              </div>
            );
          })}
        </div>

        <div className="mt-8 rounded-2xl bg-[var(--color-cream)] px-4 py-4 text-sm text-[var(--color-muted)]">
          <p className="font-semibold text-[var(--color-ink)]">How scoring works</p>
          <ul className="mt-2 space-y-1">
            <li>Exact score → +3 points</li>
            <li>Correct winner or draw → +1 point</li>
            <li>Wrong result → 0 points</li>
          </ul>
          <p className="mt-3">
            We score after the final whistle and add the points to your total automatically.
          </p>
        </div>
      </PageShell>
    </main>
  );
}
