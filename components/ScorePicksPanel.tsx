import Link from "next/link";
import { pointsReason, scoreLabel } from "@/lib/score-view";
import type { ScorePickCard } from "@/lib/services";
import { teamFlag } from "@/lib/teams";

// The Scores tab body: each LatAm + Spain score game with the viewer's pick,
// the result, points earned, and — after kickoff — what everyone else predicted.
// Server component; the [Mine]/[Everyone] toggle is plain links (URL state).

function PointsBadge({ points }: { points: number | null }) {
  if (points == null) return null;
  const tone =
    points === 3
      ? "bg-[var(--color-pitch)] text-white"
      : points === 1
        ? "bg-[var(--color-gold-soft)] text-[var(--color-ink)]"
        : "bg-black/[0.06] text-[var(--color-muted)]";
  const label = points === 3 ? "+3 · Exact! 🎯" : points === 1 ? "+1 · Right result" : "0 pts";
  return <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${tone}`}>{label}</span>;
}

function StatusChip({ card }: { card: ScorePickCard }) {
  if (card.final)
    return (
      <span className="rounded-full bg-[var(--color-navy)] px-2.5 py-1 text-xs font-bold text-white">
        FINAL {scoreLabel(card.finalA ?? 0, card.finalB ?? 0)}
      </span>
    );
  if (card.state === "closed")
    return <span className="rounded-full bg-black/[0.06] px-2.5 py-1 text-xs font-bold text-[var(--color-muted)]">Locked</span>;
  if (card.state === "open")
    return <span className="rounded-full bg-[var(--color-pitch)] px-2.5 py-1 text-xs font-bold text-white">Open now</span>;
  return <span className="rounded-full bg-black/[0.06] px-2.5 py-1 text-xs font-bold text-[var(--color-muted)]">Soon</span>;
}

function MatchHeader({ card }: { card: ScorePickCard }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <h3 className="text-base font-extrabold leading-tight text-[var(--color-ink)]">
        {card.teamA} <span className="text-[var(--color-muted)]">vs</span> {card.teamB}
      </h3>
      <StatusChip card={card} />
    </div>
  );
}

function MyCard({ card, token }: { card: ScorePickCard; token?: string }) {
  const predicted = card.myScoreA != null && card.myScoreB != null;
  return (
    <div className="card p-4">
      <MatchHeader card={card} />
      <div className="mt-3 text-sm">
        {predicted ? (
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <span className="text-[var(--color-muted)]">
              Your pick:{" "}
              <strong className="text-[var(--color-ink)]">{scoreLabel(card.myScoreA!, card.myScoreB!)}</strong>
            </span>
            {card.final ? (
              <>
                <span className="text-[var(--color-muted)]">
                  Result: <strong className="text-[var(--color-ink)]">{scoreLabel(card.finalA ?? 0, card.finalB ?? 0)}</strong>
                </span>
                <PointsBadge points={card.myPoints} />
              </>
            ) : card.state === "closed" ? (
              <span className="text-[var(--color-muted)]">🔒 Locked. Waiting for the final whistle.</span>
            ) : (
              <span className="text-[var(--color-muted)]">✅ Locked in. Kicks off {card.displayTimePt}.</span>
            )}
          </div>
        ) : card.state === "closed" ? (
          <p className="text-[var(--color-muted)]">You missed this one 😭 No points for this match.</p>
        ) : card.state === "open" ? (
          <Link href={`/picks/score${token ? `?me=${token}` : ""}`} className="font-bold text-[var(--color-pitch)] underline underline-offset-4">
            Predict the score now → up to +3 pts
          </Link>
        ) : (
          <p className="text-[var(--color-muted)]">Opens 24 hours before kickoff · {card.displayTimePt}</p>
        )}
      </div>
    </div>
  );
}

// The always-visible summary of a match (header + your pick + most popular +
// exact winners). Identical content to before — just reused as the collapsed
// face of the accordion.
function EveryoneSummary({ card }: { card: ScorePickCard }) {
  const e = card.everyone;
  const top = e?.popular[0];
  return (
    <>
      <MatchHeader card={card} />
      {card.myScoreA != null && card.myScoreB != null && (
        <p className="mt-2 text-xs text-[var(--color-muted)]">
          You picked <strong className="text-[var(--color-ink)]">{scoreLabel(card.myScoreA, card.myScoreB)}</strong>
          {card.final && <> · <PointsBadge points={card.myPoints} /></>}
        </p>
      )}
      {top && top.count > 1 && (
        <p className="mt-2 text-sm">
          <span className="text-[var(--color-muted)]">Most popular:</span>{" "}
          <strong className="text-[var(--color-ink)]">
            {card.teamA} {scoreLabel(top.scoreA, top.scoreB)} {card.teamB}
          </strong>{" "}
          <span className="text-[var(--color-muted)]">
            · {top.count} {top.count === 1 ? "person" : "people"}
            {top.isExact && " 🎯"}
          </span>
        </p>
      )}
      {e && e.exactWinners.length > 0 && (
        <p className="mt-2 text-sm">
          <span className="font-semibold text-[var(--color-pitch)]">🎯 Nailed the exact score:</span>{" "}
          {e.exactWinners.map((w) => w.name).join(", ")}
        </p>
      )}
    </>
  );
}

function EveryoneCard({ card, open }: { card: ScorePickCard; open: boolean }) {
  const e = card.everyone;

  // Not-yet-revealed / no-data states: plain card, nothing to expand.
  if (card.state !== "closed") {
    return (
      <div className="card p-4">
        <EveryoneSummary card={card} />
        <p className="mt-3 text-sm text-[var(--color-muted)]">🔒 Everyone&apos;s picks reveal at kickoff.</p>
      </div>
    );
  }
  if (!e || e.total === 0) {
    return (
      <div className="card p-4">
        <EveryoneSummary card={card} />
        <p className="mt-3 text-sm text-[var(--color-muted)]">No predictions locked yet.</p>
      </div>
    );
  }

  // Has predictions → tap the card to expand the full list (native <details>,
  // so toggling needs no client JS). `open` opens the default match.
  return (
    <details open={open} className="card group p-4">
      <summary className="cursor-pointer list-none [&::-webkit-details-marker]:hidden">
        <EveryoneSummary card={card} />
        <span className="mt-3 flex items-center justify-between text-xs font-bold text-[var(--color-pitch)]">
          <span className="group-open:hidden">👥 See all {e.total} {e.total === 1 ? "prediction" : "predictions"}</span>
          <span className="hidden group-open:inline">Hide predictions</span>
          <span aria-hidden className="transition group-open:rotate-180">▾</span>
        </span>
      </summary>
      <ul className="mt-3 divide-y divide-[var(--color-line)] rounded-xl bg-black/[0.02]">
        {e.rows.map((r, i) => (
          <li key={`${r.slug}-${i}`} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
            <span className="flex min-w-0 items-center gap-2">
              <span aria-hidden>{teamFlag(r.rootingCountry)}</span>
              {r.slug ? (
                <Link href={`/copa/${r.slug}`} className="truncate font-semibold underline-offset-4 hover:underline">
                  {r.name}
                </Link>
              ) : (
                <span className="truncate font-semibold">{r.name}</span>
              )}
            </span>
            <span className="flex shrink-0 items-center gap-2">
              <span className="tabular-nums text-[var(--color-muted)]">{scoreLabel(r.scoreA, r.scoreB)}</span>
              {card.final && <PointsBadge points={r.points} />}
            </span>
          </li>
        ))}
      </ul>
      {!card.final && (
        <p className="mt-2 text-xs text-[var(--color-muted)]">Locked. Points appear once the final score is in.</p>
      )}
    </details>
  );
}

function Toggle({ show, token }: { show: "mine" | "everyone"; token?: string }) {
  const href = (s: "mine" | "everyone") =>
    `/leaderboard?${new URLSearchParams({
      ...(token ? { me: token } : {}),
      view: "score",
      ...(s === "everyone" ? { show: "everyone" } : {}),
    }).toString()}`;
  const tab = (s: "mine" | "everyone", label: string) => (
    <Link
      href={href(s)}
      className={`flex-1 rounded-xl px-2 py-2 text-center text-sm font-bold transition ${
        show === s ? "bg-white text-[var(--color-ink)] shadow-sm" : "text-[var(--color-muted)] hover:text-[var(--color-ink)]"
      }`}
    >
      {label}
    </Link>
  );
  return (
    <div className="mb-4 flex gap-1 rounded-2xl bg-black/[0.04] p-1">
      {tab("mine", "My predictions")}
      {tab("everyone", "Everyone's")}
    </div>
  );
}

export function ScorePicksPanel({
  show,
  token,
  loggedIn,
  scorePickTotal,
  cards,
}: {
  show: "mine" | "everyone";
  token?: string;
  loggedIn: boolean;
  scorePickTotal: number;
  cards: ScorePickCard[];
}) {
  // Default-open match for the "everyone" accordion: the most recent finished
  // game where someone actually earned points (cards are already sorted
  // finished-newest-first). Falls back to the most recent revealable match.
  const accordion = cards.filter((c) => c.state === "closed" && c.everyone && c.everyone.total > 0);
  const defaultOpenId =
    (accordion.find((c) => c.final && (c.everyone?.rows.some((r) => (r.points ?? 0) >= 1) ?? false)) ??
      accordion[0])?.matchId ?? null;

  return (
    <section className="mt-6">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-bold uppercase tracking-wider text-[var(--color-muted)]">Score predictions</h2>
        {loggedIn && (
          <span className="text-sm font-bold text-[var(--color-ink)]">
            {scorePickTotal} {scorePickTotal === 1 ? "pt" : "pts"}
          </span>
        )}
      </div>

      <Toggle show={show} token={token} />

      {!loggedIn && show === "mine" ? (
        <div className="card p-6 text-center">
          <p className="font-semibold text-[var(--color-ink)]">Find your picks to see your scores</p>
          <Link href="/edit" className="mt-2 inline-block font-bold text-[var(--color-pitch)] underline underline-offset-4">
            Find my predictions →
          </Link>
        </div>
      ) : cards.length === 0 ? (
        <div className="card p-6 text-center text-[var(--color-muted)]">No score-prediction games yet.</div>
      ) : (
        <div className="space-y-3">
          {cards.map((c) =>
            show === "everyone" ? (
              <EveryoneCard key={c.matchId} card={c} open={c.matchId === defaultOpenId} />
            ) : (
              <MyCard key={c.matchId} card={c} token={token} />
            ),
          )}
        </div>
      )}
    </section>
  );
}
