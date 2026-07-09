import type { Results, Stage } from "./types";

/**
 * Merge admin-entered results over provider results. Admin override wins per
 * field, so a human can always correct an API edge case.
 *
 * `stageReached` is the one multi-value field and gets UNION semantics: teams
 * only ever accumulate as fixtures are drawn, and a key-level override would
 * freeze each stage list at whatever it held the first time it was saved —
 * the stored (older, partial) list would beat the provider's fuller one on
 * every later merge, silently dropping every subsequent qualifier.
 */
export function mergeResults(provider: Results, stored: Results): Results {
  const stages = new Set([
    ...Object.keys(provider.stageReached),
    ...Object.keys(stored.stageReached),
  ] as Stage[]);
  const stageReached: Results["stageReached"] = {};
  for (const stage of stages) {
    stageReached[stage] = [
      ...new Set([...(provider.stageReached[stage] ?? []), ...(stored.stageReached[stage] ?? [])]),
    ];
  }
  return {
    champion: stored.champion ?? provider.champion,
    groupWinners: { ...provider.groupWinners, ...stored.groupWinners },
    stageReached,
    goldenBall: stored.goldenBall ?? provider.goldenBall,
    goldenBoot: stored.goldenBoot ?? provider.goldenBoot,
    goldenGlove: stored.goldenGlove ?? provider.goldenGlove,
    matchWinners: { ...provider.matchWinners, ...stored.matchWinners },
  };
}
