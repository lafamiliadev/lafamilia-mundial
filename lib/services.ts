import "server-only";
import { db } from "./db";
import { computeAwards, type AwardsResult } from "./awards";
import { getProvider } from "./football";
import { rankParticipants, scorePredictions } from "./scoring";
import type { GroupMap, LeaderboardRow, Participant, Results } from "./types";

// Merge admin-entered results over provider results. Admin override wins per
// field, so a human can always correct an API edge case.
function mergeResults(provider: Results, stored: Results): Results {
  return {
    champion: stored.champion ?? provider.champion,
    groupWinners: {
      ...provider.groupWinners,
      ...stored.groupWinners, // admin-specified group winners take precedence
    },
    stageReached: {
      ...provider.stageReached,
      ...stored.stageReached, // admin-specified stages take precedence
    },
  };
}

/**
 * Sync the official group composition from the active provider into settings
 * (source of truth for the wizard). Used by the admin "Sync tournament" button;
 * can run pre-tournament. Won't clobber cached groups with an empty fetch.
 */
export async function syncTournamentGroups(): Promise<{
  count: number;
  provider: string;
  groups: GroupMap;
}> {
  const repo = await db();
  const provider = getProvider();
  const groups = await provider.fetchGroups();
  const count = Object.keys(groups).length;
  if (count > 0) {
    const settings = await repo.getSettings();
    await repo.saveSettings({
      ...settings,
      groups,
      groupsSyncedAt: new Date().toISOString(),
    });
  }
  return { count, provider: provider.name, groups };
}

/** Cached group composition for the wizard (letter → team codes). */
export async function getGroups(): Promise<GroupMap> {
  const repo = await db();
  const settings = await repo.getSettings();
  return settings.groups ?? {};
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

  // Snapshot each participant's CURRENT rank before recomputing — this becomes
  // their "previous rank" so the board can show ▲/▼ movement.
  const prevScores = await repo.getScores();

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

  // Capture each entry's rank the FIRST time real points exist (group-stage end)
  // so the Highest Climber award can measure the full-tournament climb.
  const scoringNow = scored.some((s) => s.total > 0);

  await repo.saveScores(
    scored.map((s) => {
      const prev = prevScores[s.participantId];
      const newRank = rankById.get(s.participantId) ?? 0;
      const existingStart = prev?.startRank ?? 0;
      return {
        participantId: s.participantId,
        base: s.base,
        bonus: s.bonus,
        total: s.total,
        rank: newRank,
        previousRank: prev?.rank ?? 0,
        startRank: existingStart > 0 ? existingStart : scoringNow ? newRank : 0,
      };
    }),
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
  /** Highest score on the board — bars are drawn relative to this. */
  leaderTotal: number;
  /** Points the gap between `me` and the person one rank above (for the chase). */
  meGapToNext: number | null;
  /** True once any points have been scored (drives "starting line" vs race UI). */
  scoringStarted: boolean;
};

/** Build the leaderboard, optionally highlighting the viewer's row by token. */
export async function getLeaderboardData(
  token?: string | null,
  topN = 10,
): Promise<LeaderboardData> {
  const repo = await db();
  const participants = await repo.listParticipants();
  const scores = await repo.getScores();

  const rows: (LeaderboardRow & { id: string; previousRank: number })[] = participants
    .map((p) => ({
      id: p.id,
      rank: scores[p.id]?.rank ?? 0,
      previousRank: scores[p.id]?.previousRank ?? 0,
      name: p.name,
      slug: p.slug,
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

  const leaderTotal = rows.length ? rows[0].total : 0;
  const scoringStarted = leaderTotal > 0;

  let meId: string | null = null;
  if (token) {
    const me = await repo.getByToken(token);
    meId = me?.id ?? null;
  }

  // movement: previousRank - rank (positive = climbed). 0 prevRank = brand new.
  const withDelta = (r: (typeof rows)[number]): LeaderboardRow => ({
    rank: r.rank,
    name: r.name,
    slug: r.slug,
    rootingCountry: r.rootingCountry,
    total: r.total,
    delta: r.previousRank > 0 ? r.previousRank - r.rank : 0,
    isMe: r.id === meId,
  });

  const top = rows.slice(0, topN).map(withDelta);

  let me: LeaderboardRow | null = null;
  let meGapToNext: number | null = null;
  if (meId) {
    const meIdx = rows.findIndex((r) => r.id === meId);
    if (meIdx >= 0) {
      me = withDelta(rows[meIdx]);
      if (meIdx > 0) meGapToNext = rows[meIdx - 1].total - rows[meIdx].total;
    }
  }

  return { total: participants.length, top, me, leaderTotal, meGapToNext, scoringStarted };
}

/** La Familia Honors — derived from everyone's picks + final scores. */
export async function getAwards(): Promise<AwardsResult> {
  const repo = await db();
  const [participants, scores, results] = await Promise.all([
    repo.listParticipants(),
    repo.getScores(),
    repo.getResults(),
  ]);
  const lite = Object.fromEntries(
    Object.entries(scores).map(([id, s]) => [id, { rank: s.rank, total: s.total, startRank: s.startRank }]),
  );
  return computeAwards(participants, lite, results);
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

export async function getReferralStats(
  slug: string,
): Promise<{ visits: number; signups: number }> {
  const repo = await db();
  const [me, signups] = await Promise.all([
    repo.getBySlug(slug),
    repo.countReferralSignups(slug),
  ]);
  return { visits: me?.referralVisits ?? 0, signups };
}
