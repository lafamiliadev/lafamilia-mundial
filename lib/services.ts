import "server-only";
import { db } from "./db";
import { getProvider } from "./football";
import { rankParticipants, scorePredictions } from "./scoring";
import type { LeaderboardRow, Participant, Results } from "./types";

// Merge admin-entered results over provider results. Admin override wins per
// field, so a human can always correct an API edge case.
function mergeResults(provider: Results, stored: Results): Results {
  return {
    champion: stored.champion ?? provider.champion,
    runnerUp: stored.runnerUp ?? provider.runnerUp,
    goldenBoot: stored.goldenBoot ?? provider.goldenBoot,
    latamFurthest: stored.latamFurthest ?? provider.latamFurthest,
    darkHorseTeam: stored.darkHorseTeam ?? provider.darkHorseTeam,
    stageReached: {
      ...provider.stageReached,
      ...stored.stageReached, // admin-specified stages take precedence
    },
  };
}

export type RecomputeReport = {
  participants: number;
  pulledFromProvider: boolean;
  champion: string | null;
  provider: string;
};

/**
 * The core automated loop: optionally pull fresh results from the active
 * provider, merge admin overrides, score every participant, and persist ranked
 * scores. Used by both the cron route and the admin "Recalculate" button.
 */
export async function recomputeScores(
  opts: { pullFromProvider: boolean } = { pullFromProvider: true },
): Promise<RecomputeReport> {
  const repo = await db();
  const provider = getProvider();
  const settings = await repo.getSettings();

  const stored = await repo.getResults();
  let merged = stored;
  if (opts.pullFromProvider) {
    const fresh = await provider.fetchResults();
    merged = mergeResults(fresh, stored);
    await repo.saveResults(merged);
  }

  const participants = await repo.listParticipants();
  const actualFinalGoals = null; // could be derived from results in future

  const scored = participants.map((p) => {
    const s = scorePredictions(p.predictions, merged, settings);
    return {
      participantId: p.id,
      name: p.name,
      total: s.total,
      base: s.base,
      bonus: s.bonus,
      finalTotalGoals: p.predictions.finalTotalGoals,
    };
  });

  const ranks = rankParticipants(scored, actualFinalGoals);
  const rankById = new Map(ranks.map((r) => [r.participantId, r.rank]));

  await repo.saveScores(
    scored.map((s) => ({
      participantId: s.participantId,
      base: s.base,
      bonus: s.bonus,
      total: s.total,
      rank: rankById.get(s.participantId) ?? 0,
    })),
  );

  return {
    participants: participants.length,
    pulledFromProvider: opts.pullFromProvider,
    champion: merged.champion,
    provider: provider.name,
  };
}

export type LeaderboardData = {
  total: number;
  top: LeaderboardRow[];
  me: LeaderboardRow | null;
};

/** Build the leaderboard, optionally highlighting the viewer's row by token. */
export async function getLeaderboardData(
  token?: string | null,
  topN = 10,
): Promise<LeaderboardData> {
  const repo = await db();
  const participants = await repo.listParticipants();
  const scores = await repo.getScores();

  const rows: (LeaderboardRow & { id: string })[] = participants
    .map((p) => ({
      id: p.id,
      rank: scores[p.id]?.rank ?? 0,
      name: p.name,
      rootingCountry: p.rootingCountry,
      total: scores[p.id]?.total ?? 0,
    }))
    .sort((a, b) => {
      if (b.total !== a.total) return b.total - a.total;
      return a.name.localeCompare(b.name);
    });

  // Assign display ranks if scoring hasn't run yet (all zero → rank by order).
  rows.forEach((r, i) => {
    if (!r.rank) r.rank = i + 1;
  });

  let meId: string | null = null;
  if (token) {
    const me = await repo.getByToken(token);
    meId = me?.id ?? null;
  }

  const top = rows.slice(0, topN).map((r) => ({
    rank: r.rank,
    name: r.name,
    rootingCountry: r.rootingCountry,
    total: r.total,
    isMe: r.id === meId,
  }));

  let me: LeaderboardRow | null = null;
  if (meId) {
    const meRow = rows.find((r) => r.id === meId);
    if (meRow) {
      me = {
        rank: meRow.rank,
        name: meRow.name,
        rootingCountry: meRow.rootingCountry,
        total: meRow.total,
        isMe: true,
      };
    }
  }

  return { total: participants.length, top, me };
}

export async function getParticipantCount(): Promise<number> {
  const repo = await db();
  return repo.countParticipants();
}

/** Most-popular champion pick — powers the hero social-proof nudge. */
export async function getTopChampionPick(): Promise<{
  code: string;
  pct: number;
} | null> {
  const repo = await db();
  const participants = await repo.listParticipants();
  const counts = new Map<string, number>();
  let total = 0;
  for (const p of participants) {
    if (!p.predictions.champion) continue;
    counts.set(p.predictions.champion, (counts.get(p.predictions.champion) ?? 0) + 1);
    total++;
  }
  if (total === 0) return null;
  const [code, count] = [...counts.entries()].sort((a, b) => b[1] - a[1])[0];
  return { code, pct: Math.round((count / total) * 100) };
}

export async function listPublicParticipants(): Promise<Participant[]> {
  const repo = await db();
  return repo.listParticipants();
}
