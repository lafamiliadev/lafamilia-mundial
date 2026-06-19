import { PageShell, TopNav } from "@/components/ui";
import { db } from "@/lib/db";
import { getSessionToken } from "@/lib/session";
import { now } from "@/lib/preview";
import { openScoreMatches } from "@/lib/score-picks";
import { ScoreForm } from "./ScoreForm";
import type { ScoreMatch } from "@/lib/types";

export const dynamic = "force-dynamic";
export const metadata = { title: "Bonus score picks · La Copa de LaFamilia 2026" };

function MatchCard({ match }: { match: ScoreMatch }) {
  return (
    <div className="card overflow-hidden">
      <div className="bg-[var(--color-pitch)] px-4 py-2 text-center">
        <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--color-gold-soft)]">
          LatAm + Spain · Locks at kickoff
        </span>
      </div>
      <div className="px-5 py-4 text-center">
        <h2 className="text-lg font-extrabold text-[var(--color-ink)]">
          {match.teamA} vs {match.teamB}
        </h2>
        <p className="mt-1 text-sm text-[var(--color-muted)]">
          Locks {match.displayTimePt} / {match.displayTimeEt.split(", ").slice(-1)[0]}
        </p>
      </div>
    </div>
  );
}

export default async function ScorePredictionPage({
  searchParams,
}: {
  searchParams: Promise<{ me?: string }>;
}) {
  const { me: meParam } = await searchParams;
  const repo = await db();
  // Identify by ?me=<token> (e.g. arriving from a leaderboard share link) first,
  // then the session cookie — so predicting works whether or not a cookie is set.
  const token = meParam ?? (await getSessionToken());
  const me = token ? await repo.getByToken(token) : null;
  const nowD = await now();
  const nowMs = nowD.getTime();

  // Every bonus game is open until its own kickoff. Show them all, soonest to
  // lock first, so people can predict the whole card whenever they want.
  const allMatches = await repo.getScoreMatches();
  const matches = openScoreMatches(allMatches, nowMs);

  // Everything has kicked off (or none exist) → nothing left to predict.
  if (matches.length === 0) {
    return (
      <main className="flex flex-1 flex-col">
        <TopNav active="picks" />
        <PageShell>
          <div className="card mt-10 overflow-hidden text-center">
            <div className="bg-[var(--color-navy)] px-5 py-7 text-white">
              <div className="text-5xl">⚽</div>
              <h1 className="mt-3 text-xl font-extrabold tracking-tight">
                That's all the bonus picks for now
              </h1>
              <p className="mt-2 text-sm text-white/85">
                Every game has kicked off. Check the leaderboard to see how your scores landed.
              </p>
              <a href="/leaderboard?view=score" className="mt-4 inline-block font-bold text-[var(--color-gold-soft)] underline underline-offset-4">
                See your scores →
              </a>
            </div>
          </div>
        </PageShell>
      </main>
    );
  }

  // Fetch all user predictions in one batch (or null if not logged in).
  const predictions = me
    ? await Promise.all(matches.map((m) => repo.getScorePrediction(me.id, m.matchId)))
    : matches.map(() => null);

  const made = predictions.filter(Boolean).length;
  const pct = matches.length ? Math.round((100 * made) / matches.length) : 0;
  const remaining = matches.length - made;

  return (
    <main className="flex flex-1 flex-col">
      <TopNav active="picks" />
      <PageShell>
        <div className="py-6">
          <p className="text-xs font-bold uppercase tracking-wider text-[var(--color-muted)]">
            LatAm + Spain matches
          </p>
          <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-[var(--color-ink)]">
            Bonus score picks
          </h1>
          <p className="mt-1 text-sm text-[var(--color-muted)]">
            Predict any game now — each one locks at kickoff. Edit anytime until then.
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

        {me && (
          <div className="mb-6 rounded-2xl border border-[var(--color-line)] bg-white p-4">
            <div className="flex items-baseline justify-between">
              <span className="text-sm text-[var(--color-muted)]">Your bonus picks</span>
              <span className="text-sm font-bold text-[var(--color-ink)]">{made} of {matches.length} made</span>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-[var(--color-cream)]">
              <div className="h-full rounded-full bg-[var(--color-pitch)]" style={{ width: `${pct}%` }} />
            </div>
            {remaining > 0 && (
              <p className="mt-2 text-xs text-[var(--color-muted)]">
                {remaining} still open — lock them in before each kickoff.
              </p>
            )}
          </div>
        )}

        <div className="space-y-8">
          {matches.map((match, i) => (
            <div key={match.matchId} className="space-y-4">
              <MatchCard match={match} />
              <ScoreForm match={match} existing={predictions[i]} isLocked={false} token={meParam} />
            </div>
          ))}
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
