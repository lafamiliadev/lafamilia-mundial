import Link from "next/link";
import type { KnockoutPickCard } from "@/lib/services";
import { kickoffTimesDual } from "@/lib/format-time";
import { teamFlag, teamName } from "@/lib/teams";

// The Knockouts tab "what others picked" reveal — the twin of ScorePicksPanel.
// Server component; the [My picks]/[Everyone's] toggle is plain links (URL state).
// Others' picks reveal only AFTER a match kicks off (locked), like the Scores tab.

function PointsBadge({ points }: { points: number | null }) {
  if (points == null) return null;
  const tone =
    points > 0
      ? "bg-[var(--color-pitch)] text-white"
      : "bg-black/[0.06] text-[var(--color-muted)]";
  return <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${tone}`}>{points > 0 ? `+${points}` : "0 pts"}</span>;
}

function StatusChip({ card }: { card: KnockoutPickCard }) {
  if (card.winner)
    return (
      <span className="rounded-full bg-[var(--color-navy)] px-2.5 py-1 text-xs font-bold text-white">
        {teamFlag(card.winner)} {teamName(card.winner)} advanced
      </span>
    );
  if (card.locked)
    return <span className="rounded-full bg-black/[0.06] px-2.5 py-1 text-xs font-bold text-[var(--color-muted)]">🔒 Locked</span>;
  return <span className="rounded-full bg-[var(--color-pitch)] px-2.5 py-1 text-xs font-bold text-white">Open now</span>;
}

function MatchHeader({ card }: { card: KnockoutPickCard }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <h3 className="text-base font-extrabold leading-tight text-[var(--color-ink)]">
        {teamFlag(card.homeCode)} {teamName(card.homeCode)}{" "}
        <span className="text-[var(--color-muted)]">vs</span> {teamFlag(card.awayCode)} {teamName(card.awayCode)}
      </h3>
      <StatusChip card={card} />
    </div>
  );
}

function MyCard({ card, token, pointsEach }: { card: KnockoutPickCard; token?: string; pointsEach: number }) {
  const picked = card.myTeam != null;
  const myCorrect = card.winner != null && card.myTeam === card.winner;
  const myPoints = myCorrect ? pointsEach * (card.myHc ? 2 : 1) : 0;
  return (
    <div className="card p-4">
      <MatchHeader card={card} />
      <div className="mt-3 text-sm">
        {picked ? (
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <span className="text-[var(--color-muted)]">
              Your pick:{" "}
              <strong className="text-[var(--color-ink)]">
                {teamFlag(card.myTeam!)} {teamName(card.myTeam!)}
              </strong>
              {card.myHc && <span className="ml-1 font-bold text-[var(--color-gold)]">⚡ 2×</span>}
            </span>
            {card.winner ? (
              <PointsBadge points={myPoints} />
            ) : card.locked ? (
              <span className="text-[var(--color-muted)]">🔒 Locked. Waiting for the result.</span>
            ) : (
              <span className="text-[var(--color-muted)]">
                ✅ Locked in.{card.kickoffIso ? ` Kicks off ${kickoffTimesDual(card.kickoffIso)}.` : ""}
              </span>
            )}
          </div>
        ) : card.locked ? (
          <p className="text-[var(--color-muted)]">You didn&apos;t pick this one 😭 No points for this match.</p>
        ) : (
          <Link
            href={`/picks/live${token ? `?token=${token}` : ""}`}
            className="font-bold text-[var(--color-pitch)] underline underline-offset-4"
          >
            Pick who advances →
          </Link>
        )}
      </div>
    </div>
  );
}

function SplitBar({ card }: { card: KnockoutPickCard }) {
  const e = card.everyone!;
  const total = e.homeCount + e.awayCount;
  const homePct = total > 0 ? Math.round((e.homeCount / total) * 100) : 0;
  return (
    <div className="mt-3">
      <div className="flex justify-between text-xs font-bold">
        <span className={card.winner === card.homeCode ? "text-[var(--color-pitch)]" : "text-[var(--color-ink)]"}>
          {teamFlag(card.homeCode)} {e.homeCount}
        </span>
        <span className={card.winner === card.awayCode ? "text-[var(--color-pitch)]" : "text-[var(--color-ink)]"}>
          {e.awayCount} {teamFlag(card.awayCode)}
        </span>
      </div>
      <div className="mt-1 flex h-2 overflow-hidden rounded-full bg-black/[0.08]">
        <div className="h-full bg-[var(--color-pitch)]" style={{ width: `${homePct}%` }} />
        <div className="h-full bg-[var(--color-gold)]" style={{ width: `${100 - homePct}%` }} />
      </div>
    </div>
  );
}

function EveryoneSummary({ card }: { card: KnockoutPickCard }) {
  return (
    <>
      <MatchHeader card={card} />
      {card.myTeam && (
        <p className="mt-2 text-xs text-[var(--color-muted)]">
          You picked{" "}
          <strong className="text-[var(--color-ink)]">
            {teamFlag(card.myTeam)} {teamName(card.myTeam)}
          </strong>
          {card.myHc && <span className="ml-1 font-bold text-[var(--color-gold)]">⚡ 2×</span>}
        </p>
      )}
      <SplitBar card={card} />
    </>
  );
}

function EveryoneCard({ card, open }: { card: KnockoutPickCard; open: boolean }) {
  // Not-yet-revealed: plain card, nothing to expand.
  if (!card.locked) {
    return (
      <div className="card p-4">
        <MatchHeader card={card} />
        <p className="mt-3 text-sm text-[var(--color-muted)]">🔒 Everyone&apos;s picks reveal at kickoff.</p>
      </div>
    );
  }
  const e = card.everyone;
  if (!e || e.total === 0) {
    return (
      <div className="card p-4">
        <MatchHeader card={card} />
        <p className="mt-3 text-sm text-[var(--color-muted)]">No picks locked for this match.</p>
      </div>
    );
  }

  return (
    <details open={open} className="card group p-4">
      <summary className="cursor-pointer list-none [&::-webkit-details-marker]:hidden">
        <EveryoneSummary card={card} />
        <span className="mt-3 flex items-center justify-between text-xs font-bold text-[var(--color-pitch)]">
          <span className="group-open:hidden">👥 See all {e.total} {e.total === 1 ? "pick" : "picks"}</span>
          <span className="hidden group-open:inline">Hide picks</span>
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
              <span className="tabular-nums text-[var(--color-muted)]">
                {teamFlag(r.team)} {teamName(r.team)}
              </span>
              {r.highConviction && <span className="font-bold text-[var(--color-gold)]">⚡</span>}
              {card.winner && <PointsBadge points={r.points} />}
            </span>
          </li>
        ))}
      </ul>
      {!card.winner && (
        <p className="mt-2 text-xs text-[var(--color-muted)]">Locked. Points appear once the result is in.</p>
      )}
    </details>
  );
}

function Toggle({ show, token }: { show: "mine" | "everyone"; token?: string }) {
  const href = (s: "mine" | "everyone") =>
    `/leaderboard?${new URLSearchParams({
      ...(token ? { me: token } : {}),
      view: "live",
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
      {tab("mine", "My picks")}
      {tab("everyone", "Everyone's")}
    </div>
  );
}

export function KnockoutPicksPanel({
  show,
  token,
  loggedIn,
  roundLabel,
  pointsEach,
  livePickTotal,
  cards,
}: {
  show: "mine" | "everyone";
  token?: string;
  loggedIn: boolean;
  roundLabel: string;
  pointsEach: number;
  livePickTotal: number;
  cards: KnockoutPickCard[];
}) {
  // Default-open the most recent locked match that has picks.
  const defaultOpenId =
    cards.filter((c) => c.locked && c.everyone && c.everyone.total > 0).slice(-1)[0]?.matchId ?? null;

  return (
    <section className="mt-6">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-bold uppercase tracking-wider text-[var(--color-muted)]">
          {roundLabel} · Who advances
        </h2>
        {loggedIn && (
          <span className="text-sm font-bold text-[var(--color-ink)]">
            {livePickTotal} {livePickTotal === 1 ? "pt" : "pts"}
          </span>
        )}
      </div>

      <Toggle show={show} token={token} />

      {!loggedIn && show === "mine" ? (
        <div className="card p-6 text-center">
          <p className="font-semibold text-[var(--color-ink)]">Find your picks to see your knockouts</p>
          <Link href="/edit" className="mt-2 inline-block font-bold text-[var(--color-pitch)] underline underline-offset-4">
            Find my predictions →
          </Link>
        </div>
      ) : cards.length === 0 ? (
        <div className="card p-6 text-center text-[var(--color-muted)]">Knockout matchups aren&apos;t set yet.</div>
      ) : (
        <div className="space-y-3">
          {cards.map((c) =>
            show === "everyone" ? (
              <EveryoneCard key={c.matchId} card={c} open={c.matchId === defaultOpenId} />
            ) : (
              <MyCard key={c.matchId} card={c} token={token} pointsEach={pointsEach} />
            ),
          )}
        </div>
      )}
    </section>
  );
}
