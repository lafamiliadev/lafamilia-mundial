import "server-only";
import { db } from "./db";
import { computeAwards, isTeamMember, type AwardsResult } from "./awards";
import { getProvider, type ProviderMatchStatus, type ProviderScore } from "./football";
import { buildLedgerLines, type LedgerLine } from "./ledger";
import { orientApiScore, scoreMatchKey } from "./score-match-link";
import { selectNewScoreMatches } from "./score-match-sync";
import { now } from "./preview";
import { rankParticipants, scorePredictions } from "./scoring";
import { scorePickState } from "./score-picks";
import { summarizeEveryone, type MatchEveryone } from "./score-view";
import { currentLiveRoundView, liveMatchOpen, liveRound, matchesForRound } from "./live";
import { summarizeLiveEveryone, type LivePickInput, type MatchLiveEveryone } from "./live-view";
import { resolveTeamCode, teamName } from "./teams";
import { KNOCKOUT_ROUNDS, LIVE_ROUND_POINTS, type KnockoutRound } from "./types";
import type { GroupMap, LeaderboardRow, LiveMatch, Participant, Results, ScoreMatch } from "./types";

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

/**
 * Auto-create score-pick matches for upcoming LatAm + Spain fixtures (group AND
 * knockouts) from the provider, so people keep earning score-prediction points
 * past the group stage with no manual admin step. Each new match is pre-linked
 * to its provider fixture, so the existing auto-scoring flow scores it. Pure
 * selection lives in score-match-sync.ts; this is the thin I/O wrapper.
 * Idempotent — only inserts fixtures not already tracked.
 */
export async function syncScorePickMatches(): Promise<{ created: number }> {
  const repo = await db();
  const provider = getProvider();
  const fixtures = await provider.fetchScores().catch(() => [] as ProviderScore[]);
  if (fixtures.length === 0) return { created: 0 };
  const fresh = selectNewScoreMatches(fixtures, await repo.getScoreMatches());
  const created = fresh.length > 0 ? await repo.createScoreMatches(fresh) : 0;
  return { created };
}

export type RecomputeReport = {
  participants: number;
  pulledFromProvider: boolean;
  champion: string | null;
  provider: string;
  /** Knockout matchups synced from the provider this run (0 when none/manual). */
  liveMatches: number;
  /** New LatAm + Spain score-pick matches auto-created from the provider. */
  scorePickMatches: number;
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
  let scorePickMatchesCreated = 0;
  if (opts.pullFromProvider) {
    // Keep the knockout matchups fresh too (auto-populates the pick cards), and
    // auto-create any new LatAm + Spain score-pick games (knockouts included),
    // then pull results. Neither sync hiccup may ever block scoring.
    liveMatchesSynced = await syncLiveMatches()
      .then((r) => r.count)
      .catch(() => 0);
    scorePickMatchesCreated = await syncScorePickMatches()
      .then((r) => r.created)
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
    scorePickMatches: scorePickMatchesCreated,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Bonus score predictions — provider linking + admin shadow view (Phase 1).
// Linking is pure metadata (never awards points). Scoring stays admin-confirmed.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Link each unlinked score-prediction match to its provider fixture by matching
 * BOTH team codes + the UTC kickoff day. Strict: links only on an unambiguous
 * single match; leaves ambiguous/unmatched rows unlinked for the admin. Never
 * touches predictions or points. Safe to re-run (skips already-linked rows).
 */
export async function syncScoreMatchFixtures(): Promise<{
  linked: number;
  ambiguous: number;
  unmatched: number;
  alreadyLinked: number;
  provider: string;
}> {
  const repo = await db();
  const provider = getProvider();
  const providerScores = await provider.fetchScores().catch(() => [] as ProviderScore[]);
  const matches = await repo.getScoreMatches();

  // Index provider fixtures by team-pair + day → fixture ids (usually one).
  const index = new Map<string, string[]>();
  for (const s of providerScores) {
    if (!s.homeCode || !s.awayCode) continue;
    const key = scoreMatchKey(s.homeCode, s.awayCode, s.kickoffIso);
    if (!key) continue;
    const arr = index.get(key) ?? [];
    arr.push(s.fixtureId);
    index.set(key, arr);
  }

  let linked = 0;
  let ambiguous = 0;
  let unmatched = 0;
  let alreadyLinked = 0;
  for (const m of matches) {
    if (m.providerFixtureId) {
      alreadyLinked++;
      continue;
    }
    const codeA = resolveTeamCode(m.teamA);
    const codeB = resolveTeamCode(m.teamB);
    if (!codeA || !codeB) {
      unmatched++;
      continue;
    }
    const key = scoreMatchKey(codeA, codeB, m.kickoffUtc);
    const hits = key ? index.get(key) ?? [] : [];
    if (hits.length === 1) {
      await repo.linkScoreMatchFixture(m.matchId, hits[0]);
      linked++;
    } else if (hits.length > 1) {
      ambiguous++;
    } else {
      unmatched++;
    }
  }
  return { linked, ambiguous, unmatched, alreadyLinked, provider: provider.name };
}

/** Lifecycle of a score match in the admin panel. */
export type ScoreMatchState =
  | "unlinked" // no provider fixture id — admin-only
  | "waiting" // linked, not kicked off / API scheduled
  | "live" // API reports in progress
  | "final-unscored" // API final + score confidently oriented; awaiting admin confirm
  | "scored" // our DB has a final score (by API-confirm or manual)
  | "review"; // linked but can't auto-confirm (no data, postponed, canceled, or mismatch)

export type ScoreMatchAdminRow = {
  match: ScoreMatch;
  maxPoints: number;
  predictionCount: number;
  state: ScoreMatchState;
  apiStatus: ProviderMatchStatus | null;
  /** API final oriented to teamA/teamB, only when confidently available. */
  apiFinalA: number | null;
  apiFinalB: number | null;
  /** e.g. "Mexico 2–0 South Africa", or null. */
  apiScoreLabel: string | null;
  /** Plain-language note for review/unlinked rows. */
  note: string | null;
};

/**
 * Read-only admin view: every score match with its live API status/score and a
 * derived state. The API value is shown for confirmation only — Phase 1 never
 * awards automatically. Resilient: if the provider is down, every linked row
 * just falls back to "review"/"waiting" and manual scoring still works.
 */
export async function getScoreMatchAdminView(): Promise<ScoreMatchAdminRow[]> {
  const repo = await db();
  const [matches, counts] = await Promise.all([
    repo.getScoreMatches(),
    repo.getScorePredictionCounts(),
  ]);
  const providerScores = await getProvider()
    .fetchScores()
    .catch(() => [] as ProviderScore[]);
  const byId = new Map(providerScores.map((s) => [s.fixtureId, s]));

  return matches.map((match) => {
    const predictionCount = counts[match.matchId] ?? 0;
    const scored = match.finalScoreA != null && match.scoredBy != null;
    const api = match.providerFixtureId ? byId.get(match.providerFixtureId) ?? null : null;

    // Orient the API home/away goals onto our team_a/team_b ordering — never
    // trust positional order, the provider may list the teams either way.
    const oriented = api ? orientApiScore(match, api) : null;
    const apiFinalA = oriented?.a ?? null;
    const apiFinalB = oriented?.b ?? null;
    const apiScoreLabel = oriented
      ? `${teamName(resolveTeamCode(match.teamA)) ?? match.teamA} ${apiFinalA}–${apiFinalB} ${teamName(resolveTeamCode(match.teamB)) ?? match.teamB}`
      : null;

    let state: ScoreMatchState;
    let note: string | null = null;
    if (scored) {
      state = "scored";
    } else if (!match.providerFixtureId) {
      state = "unlinked";
      note = "Not linked to an API fixture — link below, or score by hand.";
    } else if (!api) {
      state = "review";
      note = "Linked, but the API has no current data for this fixture.";
    } else if (api.status === "final") {
      if (oriented) {
        state = "final-unscored";
      } else {
        state = "review";
        note = "API says final, but the score didn't match these teams — score by hand.";
      }
    } else if (api.status === "live") {
      state = "live";
    } else if (api.status === "postponed" || api.status === "canceled") {
      state = "review";
      note = `API status: ${api.status}.`;
    } else {
      state = "waiting";
    }

    return {
      match,
      maxPoints: 3,
      predictionCount,
      state,
      apiStatus: api?.status ?? null,
      apiFinalA,
      apiFinalB,
      apiScoreLabel,
      note,
    };
  });
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

export type LeaderboardView = "overall" | "bracket" | "score" | "live";

/** Build a leaderboard view: "overall" total, or a single slice — "bracket",
 * "score" (LatAm + Spain score predictions), or "live" (knockout picks).
 * `total` on each row is the points for the chosen view; movement (▲/▼)
 * reflects the Overall rank. */
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
    return view === "bracket"
      ? s.bracket
      : view === "live"
        ? s.live
        : view === "score"
          ? s.scorePick
          : s.total;
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

export type PlayerLedger = {
  name: string;
  slug: string;
  total: number;
  lines: LedgerLine[];
  /** Next upcoming, unscored bonus match — for the "you can still climb" nudge. */
  nextMatch: string | null;
};

/**
 * One player's points ledger for the leaderboard drawer: every positive-point
 * entry (bracket, bonus picks, Live Picks, and per-match score picks), biggest
 * first, plus the next match they can still earn on. Read-only; referrals are a
 * separate challenge and never appear here. Returns null if the slug is unknown.
 */
export async function getPlayerLedger(slug: string): Promise<PlayerLedger | null> {
  const repo = await db();
  const me = await repo.getBySlug(slug);
  if (!me) return null;

  const [settings, results, livePicks, predictions, matches] = await Promise.all([
    repo.getSettings(),
    repo.getResults(),
    repo.getLivePicks(me.id),
    repo.listScorePredictions(me.id),
    repo.getScoreMatches(),
  ]);

  const scorePickTotal = predictions.reduce((s, p) => s + (p.pointsAwarded ?? 0), 0);
  const score = scorePredictions(me.predictions, results, settings, livePicks, scorePickTotal);
  const lines = buildLedgerLines(score.lines, predictions, matches);

  const nowMs = Date.now();
  const upcoming = matches
    .filter((m) => m.finalScoreA == null && new Date(m.kickoffUtc).getTime() > nowMs)
    .sort((a, b) => a.kickoffUtc.localeCompare(b.kickoffUtc))[0];

  return {
    name: me.name,
    slug: me.slug,
    total: score.total,
    lines,
    nextMatch: upcoming ? `${upcoming.teamA} vs ${upcoming.teamB}` : null,
  };
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
      { rank: s.rank, total: s.total, startRank: s.startRank, bracket: s.bracket, live: s.live, scorePick: s.scorePick },
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

// ── Scores tab: per-game score predictions (yours + everyone's after lock) ──

export type ScorePickCard = {
  matchId: string;
  teamA: string;
  teamB: string;
  kickoffUtc: string;
  displayTimePt: string;
  /** "open" = predictable now (before kickoff), "closed" = kicked off / locked. */
  state: "open" | "closed";
  final: boolean;
  finalA: number | null;
  finalB: number | null;
  /** The viewer's locked pick — null if they didn't predict this one. */
  myScoreA: number | null;
  myScoreB: number | null;
  myPoints: number | null;
  /** Everyone's summary — only populated for closed matches on the "everyone"
   * view (never before lock, to avoid copying). null otherwise. */
  everyone: MatchEveryone | null;
};

export type ScorePicksView = {
  loggedIn: boolean;
  show: "mine" | "everyone";
  /** The viewer's running score-prediction points (matches the leaderboard slice). */
  scorePickTotal: number;
  cards: ScorePickCard[];
};

/**
 * Assembles the Scores tab. "mine" (default) shows the viewer's pick + result +
 * points per game. "everyone" additionally reveals others' locked picks — but
 * ONLY for matches that have kicked off (state === "closed"), so nobody can copy
 * before lock. Reuses scorePickState (window) and summarizeEveryone (aggregation);
 * no parallel scoring math. Defensive throughout — never throws on missing data.
 */
export async function getScorePicksView(
  token?: string | null,
  show: "mine" | "everyone" = "mine",
): Promise<ScorePicksView> {
  const repo = await db();
  const [matches, scores, nowD] = await Promise.all([
    repo.getScoreMatches(),
    repo.getScores(),
    now(),
  ]);
  const me = token ? await repo.getByToken(token) : null;
  const myPreds = me ? await repo.listScorePredictions(me.id) : [];
  const myByMatch = new Map(myPreds.map((p) => [p.matchId, p]));
  const nowMs = nowD.getTime();

  // Bulk-load everyone's picks only when that view is active.
  const everyoneByMatch = new Map<string, Awaited<ReturnType<typeof repo.getAllScorePredictions>>>();
  if (show === "everyone") {
    const all = await repo.getAllScorePredictions();
    for (const r of all) {
      const arr = everyoneByMatch.get(r.matchId) ?? [];
      arr.push(r);
      everyoneByMatch.set(r.matchId, arr);
    }
  }

  const cards: ScorePickCard[] = matches.map((m) => {
    const state = scorePickState(m, nowMs);
    const final = m.finalScoreA != null && m.finalScoreB != null;
    const mine = myByMatch.get(m.matchId);
    const everyone =
      show === "everyone" && state === "closed"
        ? summarizeEveryone(
            everyoneByMatch.get(m.matchId) ?? [],
            final ? { a: m.finalScoreA as number, b: m.finalScoreB as number } : null,
          )
        : null;
    return {
      matchId: m.matchId,
      teamA: m.teamA,
      teamB: m.teamB,
      kickoffUtc: m.kickoffUtc,
      displayTimePt: m.displayTimePt,
      state,
      final,
      finalA: m.finalScoreA,
      finalB: m.finalScoreB,
      myScoreA: mine?.scoreA ?? null,
      myScoreB: mine?.scoreB ?? null,
      myPoints: mine?.pointsAwarded ?? null,
      everyone,
    };
  });

  // Most relevant first: games that have kicked off (newest kickoff first), then
  // everything still to come (soonest first). Keyed on kickoff — not the final
  // whistle — so a game jumps to the top the moment it starts, not when it ends.
  cards.sort((a, b) => {
    const aStarted = a.state === "closed";
    const bStarted = b.state === "closed";
    if (aStarted !== bStarted) return aStarted ? -1 : 1;
    return aStarted
      ? b.kickoffUtc.localeCompare(a.kickoffUtc)
      : a.kickoffUtc.localeCompare(b.kickoffUtc);
  });

  return {
    loggedIn: !!me,
    show,
    scorePickTotal: me ? (scores[me.id]?.scorePick ?? 0) : 0,
    cards,
  };
}

// ── Knockouts tab: who-advances picks (yours + everyone's after each kickoff) ──

export type KnockoutPickCard = {
  matchId: string;
  homeCode: string;
  awayCode: string;
  kickoffIso: string | null;
  /** The game has kicked off and can no longer be edited. */
  locked: boolean;
  /** The recorded winner, once the match is scored. null otherwise. */
  winner: string | null;
  /** The viewer's pick for this match, if any. */
  myTeam: string | null;
  myHc: boolean;
  /** Everyone's summary — only populated for LOCKED matches on the "everyone"
   * view (never before kickoff, to avoid copying). null otherwise. */
  everyone: MatchLiveEveryone | null;
};

/** One knockout round's worth of cards, grouped so past rounds stay on the page
 * under the current one (the current round expanded, older rounds collapsible). */
export type KnockoutRoundGroup = {
  round: KnockoutRound;
  roundLabel: string;
  pointsEach: number;
  /** The current/active round — rendered expanded at the top. Past rounds collapse. */
  current: boolean;
  cards: KnockoutPickCard[];
};

export type KnockoutPicksView = {
  loggedIn: boolean;
  show: "mine" | "everyone";
  /** The current/active round — headline copy + the kickoff countdown key off this. */
  round: KnockoutRound | null;
  roundLabel: string;
  pointsEach: number;
  /** The viewer's running knockout-pick points (matches the leaderboard slice). */
  livePickTotal: number;
  /** Every drawn round: the current round first, then previous rounds
   * most-recent-first, so past results never disappear when a new round opens. */
  rounds: KnockoutRoundGroup[];
};

/**
 * Assembles the Knockouts tab reveal — the twin of getScorePicksView. "mine"
 * (default) shows the viewer's pick + result per match. "everyone" additionally
 * reveals others' picks — but ONLY for matches that have kicked off (locked), so
 * nobody can copy before lock. Shows the current live round; cards are ordered by
 * kickoff. Reuses currentLiveRoundView + summarizeLiveEveryone; defensive throughout.
 */
export async function getKnockoutPicksView(
  token?: string | null,
  show: "mine" | "everyone" = "mine",
): Promise<KnockoutPicksView> {
  const repo = await db();
  const [settings, results, scores, nowD] = await Promise.all([
    repo.getSettings(),
    repo.getResults(),
    repo.getScores(),
    now(),
  ]);
  const nowMs = nowD.getTime();
  const me = token ? await repo.getByToken(token) : null;
  const livePickTotal = me ? (scores[me.id]?.live ?? 0) : 0;

  const view = currentLiveRoundView(settings.liveMatches, nowMs);
  if (!view) {
    return { loggedIn: !!me, show, round: null, roundLabel: "", pointsEach: 0, livePickTotal, rounds: [] };
  }
  const currentRound = view.round;
  const roundLabel = liveRound(currentRound)?.label ?? currentRound.toUpperCase();
  const currentPointsEach = settings.weights[LIVE_ROUND_POINTS[currentRound]];

  // My picks across ALL rounds, keyed by the globally-unique matchId (e.g. "r16-1").
  const myByMatch = new Map(
    me ? (await repo.getLivePicks(me.id)).map((p) => [p.matchId, p]) : [],
  );

  // Bulk-load everyone's picks + display fields (all rounds) only when that view
  // is active. matchIds embed the round, so one map keyed by matchId is unambiguous.
  const everyoneByMatch = new Map<string, LivePickInput[]>();
  if (show === "everyone") {
    const [all, participants] = await Promise.all([repo.listLivePicks(), repo.listParticipants()]);
    const pById = new Map(participants.map((pt) => [pt.id, pt]));
    for (const [pid, picks] of Object.entries(all)) {
      const pt = pById.get(pid);
      for (const pick of picks) {
        const arr = everyoneByMatch.get(pick.matchId) ?? [];
        arr.push({
          name: pt?.name ?? "",
          slug: pt?.slug ?? "",
          rootingCountry: pt?.rootingCountry ?? null,
          team: pick.team,
          highConviction: pick.highConviction,
        });
        everyoneByMatch.set(pick.matchId, arr);
      }
    }
  }

  const buildCard = (m: LiveMatch, pointsEach: number): KnockoutPickCard => {
    const locked = !liveMatchOpen(m, nowMs);
    const winner = results.matchWinners[m.matchId] ?? null;
    const mine = myByMatch.get(m.matchId);
    const everyone =
      show === "everyone" && locked
        ? summarizeLiveEveryone(everyoneByMatch.get(m.matchId) ?? [], m.homeCode, m.awayCode, winner, pointsEach)
        : null;
    return {
      matchId: m.matchId,
      homeCode: m.homeCode,
      awayCode: m.awayCode,
      kickoffIso: m.kickoffIso,
      locked,
      winner,
      myTeam: mine?.team ?? null,
      myHc: mine?.highConviction ?? false,
      everyone,
    };
  };

  // Same intra-round ordering as the Scores tab: games that have kicked off
  // (locked) rise to the top, newest kickoff first, then upcoming, soonest first.
  const sortCards = (cards: KnockoutPickCard[]) =>
    cards.sort((a, b) => {
      if (a.locked !== b.locked) return a.locked ? -1 : 1;
      const ak = a.kickoffIso ?? "";
      const bk = b.kickoffIso ?? "";
      return a.locked ? bk.localeCompare(ak) : ak.localeCompare(bk);
    });

  // Every round with drawn matchups. Display the current round first, then the
  // rest most-recent-first, so a finished round (e.g. Round of 32) stays visible
  // — collapsible — beneath the active one instead of disappearing.
  const drawn = KNOCKOUT_ROUNDS.filter((r) => matchesForRound(settings.liveMatches, r).length > 0);
  const ordered = [currentRound, ...drawn.filter((r) => r !== currentRound).reverse()];

  const rounds: KnockoutRoundGroup[] = ordered.map((r) => {
    const pointsEach = settings.weights[LIVE_ROUND_POINTS[r]];
    return {
      round: r,
      roundLabel: liveRound(r)?.label ?? r.toUpperCase(),
      pointsEach,
      current: r === currentRound,
      cards: sortCards(matchesForRound(settings.liveMatches, r).map((m) => buildCard(m, pointsEach))),
    };
  });

  return { loggedIn: !!me, show, round: currentRound, roundLabel, pointsEach: currentPointsEach, livePickTotal, rounds };
}
