import "server-only";
import { db } from "./db";
import { computeAwards, isTeamMember, type AwardsResult } from "./awards";
import { getProvider } from "./football";
import { rankParticipants, scorePredictions } from "./scoring";
import type { GroupMap, LeaderboardRow, Participant, Results } from "./types";

// Merge admin-entered results over provider results. Admin override wins per
// field, so a human can always correct an API edge case.
function mergeResults(provider: Results, stored: Results): Results {
  return {
    champion: stored.champion ?? provider.champion,
    groupWinners: { ...provider.groupWinners, ...stored.groupWinners },
    stageReached: { ...provider.stageReached, ...stored.stageReached },
    goldenBall: stored.goldenBall ?? provider.goldenBall,
    goldenBoot: stored.goldenBoot ?? provider.goldenBoot,
    goldenGlove: stored.goldenGlove ?? provider.goldenGlove,
    matchWinners: { ...provider.matchWinners, ...stored.matchWinners },
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

/**
 * Sync the knockout matchups (who plays whom) from the active provider into
 * settings, so the Live Picks pick cards populate automatically. When the
 * provider returns nothing (no key, or rounds not drawn yet) it leaves the
 * existing matchups untouched — so an admin's manual entries are never wiped by
 * an empty fetch. The provider's stable match ids are the source of truth.
 */
export async function syncLiveMatches(): Promise<{ count: number; provider: string }> {
  const repo = await db();
  const provider = getProvider();
  const matches = await provider.fetchKnockoutMatches();
  if (matches.length > 0) {
    const settings = await repo.getSettings();
    await repo.saveSettings({
      ...settings,
      liveMatches: matches,
      liveMatchesSyncedAt: new Date().toISOString(),
    });
  }
  return { count: matches.length, provider: provider.name };
}

export type RecomputeReport = {
  participants: number;
  pulledFromProvider: boolean;
  champion: string | null;
  provider: string;
  /** Knockout matchups synced from the provider this run (0 when none/manual). */
  liveMatches: number;
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
  let liveMatchesSynced = 0;
  if (opts.pullFromProvider) {
    // Keep the knockout matchups fresh too (auto-populates the pick cards), then
    // pull results. A matchup-sync hiccup must never block scoring.
    liveMatchesSynced = await syncLiveMatches()
      .then((r) => r.count)
      .catch(() => 0);
    const fresh = await provider.fetchResults();
    merged = mergeResults(fresh, stored);
    await repo.saveResults(merged);
  }

  const participants = await repo.listParticipants();
  const actualFinalGoals = null; // could be derived from results in future
  const prevScores = await repo.getScores();
  const [allLivePicks, scorePredictionTotals] = await Promise.all([
    repo.listLivePicks(),
    repo.getScorePredictionTotals(),
  ]);

  const scored = participants.map((p) => {
    const spBonus = scorePredictionTotals[p.id] ?? 0;
    const s = scorePredictions(p.predictions, merged, settings, allLivePicks[p.id] ?? [], spBonus);
    return {
      participantId: p.id,
      name: p.name,
      total: s.total,
      bracket: s.bracket,
      bonus: s.bonus,
      live: s.live,
      scorePick: s.scorePick,
      finalTotalGoals: p.predictions.finalTotalGoals,
      // Tie-break inputs (spec order): champion → live picks → goals → submission.
      championCorrect: Boolean(merged.champion) && p.predictions.champion === merged.champion,
      liveCorrect: s.lines.filter((l) => l.group === "live").length,
      submittedAt: p.createdAt,
    };
  });

  const ranks = rankParticipants(scored, actualFinalGoals);
  const rankById = new Map(ranks.map((r) => [r.participantId, r.rank]));
  // El Escalador measures the climb "from the end of the group stage". Freeze
  // each player's starting line the first time all 12 groups are decided — not
  // at the first scored run, which can land mid-group-stage as winners trickle in.
  const groupStageDone = Object.values(merged.groupWinners).filter(Boolean).length >= 12;

  await repo.saveScores(
    scored.map((s) => {
      const prev = prevScores[s.participantId];
      const newRank = rankById.get(s.participantId) ?? 0;
      const existingStart = prev?.startRank ?? 0;
      return {
        participantId: s.participantId,
        bracket: s.bracket,
        bonus: s.bonus,
        live: s.live,
        scorePick: s.scorePick,
        total: s.total,
        rank: newRank,
        previousRank: prev?.rank ?? 0,
        startRank: existingStart > 0 ? existingStart : groupStageDone ? newRank : 0,
      };
    }),
  );

  return {
    participants: participants.length,
    pulledFromProvider: opts.pullFromProvider,
    champion: merged.champion,
    provider: provider.name,
    liveMatches: liveMatchesSynced,
  };
}

export type ScoreBreakdown = {
  bracket: number;
  bonus: number;
  live: number;
  scorePick: number;
  total: number;
};

export type LeaderboardData = {
  total: number;
  /** The first `topN` ranked rows (podium + first chasers). */
  top: LeaderboardRow[];
  /** Every ranked row, in order — lets the UI page through the full field so the
   * visible list matches the `total` count instead of stopping at `topN`. */
  all: LeaderboardRow[];
  me: LeaderboardRow | null;
  /** Highest score on the board — bars are drawn relative to this. */
  leaderTotal: number;
  /** Points the gap between `me` and the person one rank above (for the chase). */
  meGapToNext: number | null;
  /** True once any points have been scored (drives "starting line" vs race UI). */
  scoringStarted: boolean;
  /** Score breakdown for the viewer (bracket / bonus picks / live / score predictions). */
  meScoreBreakdown: ScoreBreakdown | null;
};

export type LeaderboardView = "overall" | "bracket" | "live";

/** Build a leaderboard view ("overall" total, "bracket"-only, or "live"-only),
 * optionally highlighting the viewer's row by token. `total` on each row is the
 * points for the chosen view; movement (▲/▼) reflects the Overall rank. */
export async function getLeaderboardData(
  token?: string | null,
  topN = 10,
  view: LeaderboardView = "overall",
): Promise<LeaderboardData> {
  const repo = await db();
  const participants = await repo.listParticipants();
  const scores = await repo.getScores();
  const pointsFor = (id: string) => {
    const s = scores[id];
    if (!s) return 0;
    return view === "bracket" ? s.bracket : view === "live" ? s.live : s.total;
  };

  const rows: (LeaderboardRow & { id: string; previousRank: number })[] = participants
    .map((p) => ({
      id: p.id,
      rank: scores[p.id]?.rank ?? 0,
      previousRank: scores[p.id]?.previousRank ?? 0,
      name: p.name,
      slug: p.slug,
      rootingCountry: p.rootingCountry,
      champion: p.predictions.champion,
      total: pointsFor(p.id),
    }))
    .sort((a, b) => {
      if (b.total !== a.total) return b.total - a.total;
      return a.name.localeCompare(b.name);
    });

  const leaderTotal = rows.length ? rows[0].total : 0;
  const scoringStarted = leaderTotal > 0;

  // Rank for THIS view. The rows are already sorted by the view's own points
  // (overall total, bracket-only, or live-only), so the displayed rank must be
  // derived from THAT order — not the stored Overall rank, or the Bracket/Live
  // tabs would show scrambled numbers. Standard competition ranking (1,2,2,4)
  // on the view's points once any are scored; positional (1,2,3…) on the
  // pre-kickoff starting line where everyone is on zero.
  if (!scoringStarted) {
    rows.forEach((r, i) => {
      r.rank = i + 1;
    });
  } else {
    let lastTotal: number | null = null;
    let lastRank = 0;
    rows.forEach((r, i) => {
      const rank = lastTotal === r.total ? lastRank : i + 1;
      r.rank = rank;
      lastTotal = r.total;
      lastRank = rank;
    });
  }

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
    champion: r.champion,
    total: r.total,
    // Movement arrows only make sense in Overall, where the stored previousRank
    // shares a basis with rank. Slice views have no stored "previous slice
    // rank", so showing an arrow there would be misleading — omit it.
    delta: view === "overall" && r.previousRank > 0 ? r.previousRank - r.rank : 0,
    isMe: r.id === meId,
  });

  const all = rows.map(withDelta);
  const top = all.slice(0, topN);

  let me: LeaderboardRow | null = null;
  let meGapToNext: number | null = null;
  let meScoreBreakdown: ScoreBreakdown | null = null;
  if (meId) {
    const meIdx = rows.findIndex((r) => r.id === meId);
    if (meIdx >= 0) {
      me = withDelta(rows[meIdx]);
      if (meIdx > 0) meGapToNext = rows[meIdx - 1].total - rows[meIdx].total;
      const s = scores[meId];
      if (s) {
        meScoreBreakdown = {
          bracket: s.bracket,
          bonus: s.bonus,
          live: s.live,
          scorePick: s.scorePick ?? 0,
          total: s.total,
        };
      }
    }
  }

  return { total: participants.length, top, all, me, leaderTotal, meGapToNext, scoringStarted, meScoreBreakdown };
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
    Object.entries(scores).map(([id, s]) => [
      id,
      { rank: s.rank, total: s.total, startRank: s.startRank, bracket: s.bracket, live: s.live },
    ]),
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

export type Inviter = {
  rank: number;
  slug: string;
  name: string;
  rootingCountry: string | null;
  count: number;
  isMe: boolean;
};

/**
 * "Bringing the Familia" — who has brought in the most people via their share
 * link. Pure referral attribution (referredBy), so it's live the moment picks
 * open — the one competition that works before a single match is played.
 */
export async function getFamiliaInviters(
  topN = 10,
  token?: string | null,
): Promise<{ top: Inviter[]; me: Inviter | null; total: number }> {
  const repo = await db();
  const participants = await repo.listParticipants();
  const bySlug = new Map(participants.map((p) => [p.slug, p]));

  const counts = new Map<string, number>();
  let total = 0; // people who joined via a member's link
  for (const p of participants) {
    if (p.referredBy && bySlug.has(p.referredBy)) {
      // The LaFamilia team seeded the game — keep them out of the public
      // invite competition so it's a real race between members.
      if (isTeamMember(bySlug.get(p.referredBy)!)) continue;
      counts.set(p.referredBy, (counts.get(p.referredBy) ?? 0) + 1);
      total++;
    }
  }

  let meSlug: string | null = null;
  if (token) meSlug = (await repo.getByToken(token))?.slug ?? null;

  const ranked: Inviter[] = [...counts.entries()]
    .map(([slug, count]) => {
      const u = bySlug.get(slug)!;
      return { slug, name: u.name, rootingCountry: u.rootingCountry, count };
    })
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
    .map((r, i) => ({ ...r, rank: i + 1, isMe: r.slug === meSlug }));

  const me = meSlug ? (ranked.find((r) => r.isMe) ?? null) : null;
  return { top: ranked.slice(0, topN), me, total };
}

export type Rivalry = {
  rivalName: string;
  rivalSlug: string;
  /** Who started the rivalry: they invited you, or you invited them. */
  relation: "invitedYou" | "youInvited";
  myTotal: number;
  rivalTotal: number;
  /** myTotal − rivalTotal (positive = you're ahead). */
  diff: number;
  scoringStarted: boolean;
};

/**
 * The viewer's closest head-to-head: the friend who invited them, or — failing
 * that — the first friend they invited. One real rivalry is enough to create a
 * reason to come back and re-share. Pre-tournament both sit at 0 (still a hook).
 */
export async function getRivalry(token: string): Promise<Rivalry | null> {
  const repo = await db();
  const me = await repo.getByToken(token);
  if (!me) return null;

  let rival = me.referredBy ? await repo.getBySlug(me.referredBy) : null;
  let relation: Rivalry["relation"] = "invitedYou";
  if (!rival || rival.id === me.id) {
    const invitees = (await repo.listParticipants())
      .filter((p) => p.referredBy === me.slug && p.id !== me.id)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    if (invitees[0]) {
      rival = invitees[0];
      relation = "youInvited";
    }
  }
  if (!rival || rival.id === me.id) return null;

  const scores = await repo.getScores();
  const myTotal = scores[me.id]?.total ?? 0;
  const rivalTotal = scores[rival.id]?.total ?? 0;
  const scoringStarted = Object.values(scores).some((s) => s.total > 0);

  return {
    rivalName: rival.name.split(" ")[0],
    rivalSlug: rival.slug,
    relation,
    myTotal,
    rivalTotal,
    diff: myTotal - rivalTotal,
    scoringStarted,
  };
}
