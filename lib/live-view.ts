// Pure helpers for the "what others picked" reveal on the Knockouts tab — the
// twin of lib/score-view.ts. No DB, no server-only, so they unit-test cleanly.
// Everything is defensive: missing names / missing winner / empty pick sets all
// produce a sane result instead of throwing.

const safeName = (n: string | null | undefined) => (n && n.trim() ? n.trim() : "Anónimo");

/** One member's knockout pick for a match, already joined with display fields. */
export type LivePickInput = {
  name: string;
  slug: string;
  rootingCountry: string | null;
  team: string;
  highConviction: boolean;
};

export type LiveEveryoneRow = {
  name: string;
  slug: string;
  rootingCountry: string | null;
  team: string;
  highConviction: boolean;
  /** null until the match has a recorded winner. */
  points: number | null;
  correct: boolean;
};

export type MatchLiveEveryone = {
  total: number;
  /** Pickers per side, keyed by team code. */
  homeCount: number;
  awayCount: number;
  winner: string | null;
  rows: LiveEveryoneRow[];
};

/**
 * Summarize everyone's picks for ONE knockout match: how many took each side,
 * who was right (once the winner is in), and a winners-first row list. `winner`
 * is null until the match is scored — everything still renders, just without
 * correct/points flags. `basePoints` is the round's per-correct value; a High
 * Conviction pick scores double.
 */
export function summarizeLiveEveryone(
  picks: LivePickInput[],
  homeCode: string,
  awayCode: string,
  winner: string | null,
  basePoints: number,
): MatchLiveEveryone {
  const list = Array.isArray(picks) ? picks : [];
  let homeCount = 0;
  let awayCount = 0;
  for (const p of list) {
    if (p.team === homeCode) homeCount += 1;
    else if (p.team === awayCode) awayCount += 1;
  }

  const rows: LiveEveryoneRow[] = list
    .map((p) => {
      const correct = winner != null && p.team === winner;
      const points = winner == null ? null : correct ? basePoints * (p.highConviction ? 2 : 1) : 0;
      return {
        name: safeName(p.name),
        slug: p.slug ?? "",
        rootingCountry: p.rootingCountry ?? null,
        team: p.team,
        highConviction: Boolean(p.highConviction),
        points,
        correct,
      };
    })
    // Winners first, then High Conviction, then alphabetical.
    .sort((a, b) => {
      const rank = (r: LiveEveryoneRow) => (r.correct ? 0 : 1);
      return (
        rank(a) - rank(b) ||
        Number(b.highConviction) - Number(a.highConviction) ||
        a.name.localeCompare(b.name)
      );
    });

  return { total: list.length, homeCount, awayCount, winner, rows };
}
