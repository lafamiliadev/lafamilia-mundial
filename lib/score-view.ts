// Pure helpers for the Scores tab + points email. No DB, no server-only — so
// they unit-test cleanly and never reach for data they weren't handed. Every
// function is defensive: missing names, missing final score, and empty
// prediction sets all produce a sane result instead of throwing.

/** One locked prediction, already joined with the predictor's display fields. */
export type PredInput = {
  participantId: string;
  name: string;
  slug: string;
  rootingCountry: string | null;
  scoreA: number;
  scoreB: number;
  pointsAwarded: number | null;
};

export type PopularScore = {
  scoreA: number;
  scoreB: number;
  count: number;
  /** True once the match is final and this line matches the result. */
  isExact: boolean;
};

export type EveryoneRow = {
  name: string;
  slug: string;
  rootingCountry: string | null;
  scoreA: number;
  scoreB: number;
  /** null until the match is scored. */
  points: number | null;
  isExact: boolean;
  correct: boolean;
};

export type MatchEveryone = {
  total: number;
  popular: PopularScore[];
  exactWinners: { name: string; slug: string; rootingCountry: string | null }[];
  rows: EveryoneRow[];
};

const safeName = (n: string | null | undefined) => (n && n.trim() ? n.trim() : "Anónimo");

/** Plain-language reason a prediction earned what it did. */
export function pointsReason(points: number | null): string {
  if (points === 3) return "Exact score";
  if (points === 1) return "Correct result";
  if (points === 0) return "Didn't match";
  return "Not scored yet";
}

/** "1–0" style label. */
export function scoreLabel(a: number, b: number): string {
  return `${a}–${b}`;
}

/**
 * Summarize all predictions for ONE match: how many picked each score (most
 * popular first), who nailed the exact score, and a winners-first row list.
 * `final` is null until the match is scored — everything still renders, just
 * without exact/correct flags.
 */
export function summarizeEveryone(
  preds: PredInput[],
  final: { a: number; b: number } | null,
): MatchEveryone {
  const list = Array.isArray(preds) ? preds : [];
  const isExactPred = (p: PredInput) =>
    final != null && p.scoreA === final.a && p.scoreB === final.b;

  // Most-popular score lines.
  const byLine = new Map<string, PopularScore>();
  for (const p of list) {
    const key = `${p.scoreA}-${p.scoreB}`;
    const existing = byLine.get(key);
    if (existing) existing.count += 1;
    else byLine.set(key, { scoreA: p.scoreA, scoreB: p.scoreB, count: 1, isExact: isExactPred(p) });
  }
  const popular = [...byLine.values()].sort(
    (a, b) => b.count - a.count || a.scoreA - b.scoreA || a.scoreB - b.scoreB,
  );

  const exactWinners = list
    .filter(isExactPred)
    .map((p) => ({ name: safeName(p.name), slug: p.slug ?? "", rootingCountry: p.rootingCountry ?? null }))
    .sort((a, b) => a.name.localeCompare(b.name));

  const rows: EveryoneRow[] = list
    .map((p) => {
      const isExact = isExactPred(p);
      const points = p.pointsAwarded ?? null;
      return {
        name: safeName(p.name),
        slug: p.slug ?? "",
        rootingCountry: p.rootingCountry ?? null,
        scoreA: p.scoreA,
        scoreB: p.scoreB,
        points,
        isExact,
        correct: (points ?? 0) >= 1,
      };
    })
    // Winners first (exact, then correct, then the rest), alphabetical within.
    .sort((a, b) => {
      const rank = (r: EveryoneRow) => (r.isExact ? 0 : r.correct ? 1 : 2);
      return rank(a) - rank(b) || a.name.localeCompare(b.name);
    });

  return { total: list.length, popular, exactWinners, rows };
}
