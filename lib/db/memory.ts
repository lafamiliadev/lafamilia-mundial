import { promises as fs } from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { DEFAULT_SETTINGS, DEFAULT_WEIGHTS, EMPTY_RESULTS } from "../types";
import { baseSlug, uniqueSlug } from "../slug";
import type { DailyPick, LivePick, Participant, Predictions, Results, ScoreMatch, ScorePrediction, Settings } from "../types";
import type {
  ContentItem,
  CreateParticipantInput,
  Repo,
  ScoreRow,
  UpdateInput,
} from "./repo";

// Zero-config dev store. Persists to .data/dev.json so entries survive HMR and
// server restarts during local development. NOT used when Supabase is set.

type Shape = {
  settings: Settings;
  participants: Participant[];
  results: Results;
  scores: Record<string, Omit<ScoreRow, "participantId">>;
  livePicks: Record<string, LivePick[]>;
  dailyPicks: Record<string, DailyPick[]>;
  content: ContentItem[];
  scoreMatches: ScoreMatch[];
  scorePredictions: ScorePrediction[];
  scoreEmailLog: Array<{ participantId: string; templateId: string; status: string }>;
};

const DATA_DIR = path.join(process.cwd(), ".data");
const DATA_FILE = path.join(DATA_DIR, "dev.json");

const EMPTY_SHAPE = (): Shape => ({
  settings: DEFAULT_SETTINGS,
  participants: [],
  results: EMPTY_RESULTS,
  scores: {},
  livePicks: {},
  dailyPicks: {},
  content: [],
  scoreMatches: [],
  scorePredictions: [],
  scoreEmailLog: [],
});

// Backfill fields added after some dev entries were already written, so old
// .data/dev.json files keep working (and existing resume links stay valid).
function normalize(data: Shape): { data: Shape; mutated: boolean } {
  let mutated = false;

  // Upgrade settings written before the "Group Winners + Final Four" format
  // (old weights lacked groupWinner). Keep lockTime + any synced groups.
  const w = data.settings?.weights as Partial<typeof DEFAULT_WEIGHTS> | undefined;
  if (!w || typeof w.groupWinner !== "number") {
    data.settings = {
      ...DEFAULT_SETTINGS,
      ...data.settings,
      weights: DEFAULT_WEIGHTS,
      groups: data.settings?.groups ?? {},
      groupsSyncedAt: data.settings?.groupsSyncedAt ?? null,
    };
    mutated = true;
  }

  const used = new Set<string>();
  for (const p of data.participants) if (p.slug) used.add(p.slug);
  for (const p of data.participants) {
    if (!p.slug) {
      let base = baseSlug(p.name);
      let s = base;
      let i = 2;
      while (used.has(s)) s = `${base}-${i++}`;
      used.add(s);
      p.slug = s;
      mutated = true;
    }
    if (p.referredBy === undefined) {
      p.referredBy = null;
      mutated = true;
    }
    if (typeof p.referralVisits !== "number") {
      p.referralVisits = 0;
      mutated = true;
    }
    if (p.city === undefined) {
      p.city = null;
      mutated = true;
    }
    // Migrate predictions to the new shape: preserve champion (pre-fills on
    // re-pick), drop the old 6-pick fields, ensure new keys exist.
    const pred = p.predictions as Partial<Predictions> & Record<string, unknown>;
    if (pred && (!("groupWinners" in pred) || !("semifinalists" in pred) || !("bonus" in pred))) {
      p.predictions = {
        groupWinners: (pred.groupWinners as Predictions["groupWinners"]) ?? null,
        semifinalists: (pred.semifinalists as Predictions["semifinalists"]) ?? null,
        champion: (pred.champion as string | null) ?? null,
        finalTotalGoals: (pred.finalTotalGoals as number | null) ?? null,
        bonus: (pred.bonus as Predictions["bonus"]) ?? null,
      };
      mutated = true;
    }
  }
  return { data, mutated };
}

// Always read fresh from disk. Next dev can run route handlers, server
// components, and server actions in separate module instances, so an in-memory
// read cache would go stale across them. The file is tiny — reading per call
// keeps every context consistent.
async function load(): Promise<Shape> {
  let parsed: Shape;
  try {
    parsed = JSON.parse(await fs.readFile(DATA_FILE, "utf8")) as Shape;
  } catch {
    return EMPTY_SHAPE();
  }
  const { data, mutated } = normalize(parsed);
  if (mutated) await persist(data);
  return data;
}

async function persist(data: Shape): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(DATA_FILE, JSON.stringify(data, null, 2), "utf8");
}

/** Backfill the provider-link fields on a score match read from an older store. */
function smDefaults(m: ScoreMatch): ScoreMatch {
  return {
    ...m,
    providerFixtureId: m.providerFixtureId ?? null,
    scoredBy: m.scoredBy ?? null,
    scoredAt: m.scoredAt ?? null,
  };
}

export const memoryRepo: Repo = {
  async getSettings() {
    const s = (await load()).settings;
    // Merge over defaults so any weight field added later is never undefined.
    return { ...DEFAULT_SETTINGS, ...s, weights: { ...DEFAULT_WEIGHTS, ...s.weights } };
  },
  async saveSettings(settings) {
    const data = await load();
    await persist({ ...data, settings });
  },

  async countParticipants() {
    return (await load()).participants.length;
  },

  async createParticipant(input: CreateParticipantInput) {
    const data = await load();
    const email = input.email.toLowerCase();

    // Upsert on email — re-submitting edits the entry but PRESERVES the slug,
    // referral attribution, visit count, token, and id.
    const existingIdx = data.participants.findIndex((p) => p.email === email);
    if (existingIdx >= 0) {
      const existing = data.participants[existingIdx];
      data.participants[existingIdx] = {
        ...existing,
        name: input.name,
        rootingCountry: input.rootingCountry,
        crewCode: input.crewCode,
        ...(input.city !== undefined ? { city: input.city } : {}),
        predictions: input.predictions,
      };
      await persist(data);
      return data.participants[existingIdx];
    }

    const slug = await uniqueSlug(baseSlug(input.name), async (s) =>
      data.participants.some((p) => p.slug === s),
    );
    const participant: Participant = {
      id: randomUUID(),
      name: input.name,
      email,
      rootingCountry: input.rootingCountry,
      resumeToken: randomUUID(),
      slug,
      referredBy: input.referredBy ?? null,
      referralVisits: 0,
      crewCode: input.crewCode,
      city: input.city ?? null,
      createdAt: new Date().toISOString(),
      predictions: input.predictions,
    };
    data.participants.push(participant);
    await persist(data);
    return participant;
  },

  async getByToken(token) {
    const data = await load();
    return data.participants.find((p) => p.resumeToken === token) ?? null;
  },

  async getByEmail(email) {
    const data = await load();
    return (
      data.participants.find((p) => p.email === email.toLowerCase()) ?? null
    );
  },

  async getBySlug(slug) {
    const data = await load();
    return data.participants.find((p) => p.slug === slug) ?? null;
  },

  async incrementReferralVisits(slug) {
    const data = await load();
    const p = data.participants.find((x) => x.slug === slug);
    if (!p) return;
    p.referralVisits = (p.referralVisits ?? 0) + 1;
    await persist(data);
  },

  async countReferralSignups(slug) {
    const data = await load();
    return data.participants.filter((p) => p.referredBy === slug).length;
  },

  async updateByToken(token, input: UpdateInput) {
    const data = await load();
    const idx = data.participants.findIndex((p) => p.resumeToken === token);
    if (idx < 0) return null;
    const p = data.participants[idx];
    data.participants[idx] = {
      ...p,
      name: input.name ?? p.name,
      rootingCountry:
        input.rootingCountry !== undefined
          ? input.rootingCountry
          : p.rootingCountry,
      city: input.city !== undefined ? input.city : p.city ?? null,
      predictions: { ...p.predictions, ...(input.predictions ?? {}) },
    };
    await persist(data);
    return data.participants[idx];
  },

  async listParticipants() {
    return [...(await load()).participants];
  },

  async getResults() {
    return (await load()).results;
  },
  async saveResults(results: Results) {
    const data = await load();
    await persist({ ...data, results });
  },

  async getScores() {
    return (await load()).scores;
  },
  async saveScores(rows: ScoreRow[]) {
    const data = await load();
    const scores: Shape["scores"] = {};
    for (const r of rows) {
      scores[r.participantId] = {
        bracket: r.bracket,
        bonus: r.bonus,
        live: r.live,
        scorePick: r.scorePick,
        total: r.total,
        rank: r.rank,
        previousRank: r.previousRank,
        startRank: r.startRank,
      };
    }
    await persist({ ...data, scores });
  },

  async getLivePicks(participantId) {
    return (await load()).livePicks?.[participantId] ?? [];
  },
  async saveLivePicks(participantId, picks) {
    const data = await load();
    const livePicks = { ...(data.livePicks ?? {}), [participantId]: picks };
    await persist({ ...data, livePicks });
  },
  async listLivePicks() {
    return (await load()).livePicks ?? {};
  },
  async getDailyPicks(participantId) {
    return (await load()).dailyPicks?.[participantId] ?? [];
  },
  async saveDailyPicks(participantId, picks) {
    const data = await load();
    const dailyPicks = { ...(data.dailyPicks ?? {}), [participantId]: picks };
    await persist({ ...data, dailyPicks });
  },

  async listContent() {
    return [...(await load()).content].sort((a, b) =>
      b.createdAt.localeCompare(a.createdAt),
    );
  },
  async addContent(items) {
    const data = await load();
    const now = new Date().toISOString();
    const newItems: ContentItem[] = items.map((i) => ({
      ...i,
      id: randomUUID(),
      createdAt: now,
    }));
    await persist({ ...data, content: [...data.content, ...newItems] });
  },

  async getScoreMatches() {
    return [...((await load()).scoreMatches ?? [])]
      .map(smDefaults)
      .sort((a, b) => a.kickoffUtc.localeCompare(b.kickoffUtc));
  },

  async getUpcomingScoreMatches(nowIso, withinHours = 24) {
    const cutoff = new Date(new Date(nowIso).getTime() + withinHours * 60 * 60 * 1000).toISOString();
    const data = await load();
    return (data.scoreMatches ?? [])
      .filter((m) => m.kickoffUtc > nowIso && m.kickoffUtc <= cutoff)
      .map(smDefaults)
      .sort((a, b) => a.kickoffUtc.localeCompare(b.kickoffUtc));
  },

  async getScoreMatch(matchId) {
    const data = await load();
    const m = (data.scoreMatches ?? []).find((m) => m.matchId === matchId);
    return m ? smDefaults(m) : null;
  },

  async getScorePrediction(participantId, matchId) {
    const data = await load();
    return (data.scorePredictions ?? []).find(
      (p) => p.participantId === participantId && p.matchId === matchId,
    ) ?? null;
  },

  async listScorePredictions(participantId) {
    const data = await load();
    return (data.scorePredictions ?? []).filter((p) => p.participantId === participantId);
  },

  async upsertScorePrediction({ participantId, matchId, scoreA, scoreB }) {
    const data = await load();
    const now = new Date().toISOString();
    const existing = (data.scorePredictions ?? []).findIndex(
      (p) => p.participantId === participantId && p.matchId === matchId,
    );
    let pred: ScorePrediction;
    if (existing >= 0) {
      pred = { ...data.scorePredictions[existing], scoreA, scoreB, updatedAt: now };
      data.scorePredictions[existing] = pred;
    } else {
      pred = {
        id: randomUUID(),
        participantId,
        matchId,
        scoreA,
        scoreB,
        pointsAwarded: null,
        submittedAt: now,
        updatedAt: now,
      };
      data.scorePredictions = [...(data.scorePredictions ?? []), pred];
    }
    await persist(data);
    return pred;
  },

  async getScorePredictionTotals() {
    const data = await load();
    const totals: Record<string, number> = {};
    for (const p of data.scorePredictions ?? []) {
      if (p.pointsAwarded != null) {
        totals[p.participantId] = (totals[p.participantId] ?? 0) + p.pointsAwarded;
      }
    }
    return totals;
  },

  async getScorePredictionCounts() {
    const data = await load();
    const counts: Record<string, number> = {};
    for (const p of data.scorePredictions ?? []) {
      counts[p.matchId] = (counts[p.matchId] ?? 0) + 1;
    }
    return counts;
  },

  async linkScoreMatchFixture(matchId, providerFixtureId) {
    const data = await load();
    const matches = (data.scoreMatches ?? []).map((m) =>
      m.matchId === matchId ? { ...smDefaults(m), providerFixtureId } : m,
    );
    await persist({ ...data, scoreMatches: matches });
  },

  async scoreMatch(matchId, finalScoreA, finalScoreB, scoredBy) {
    const data = await load();
    const matches = data.scoreMatches ?? [];
    const matchIdx = matches.findIndex((m) => m.matchId === matchId);
    if (matchIdx >= 0) {
      matches[matchIdx] = {
        ...smDefaults(matches[matchIdx]),
        finalScoreA,
        finalScoreB,
        scoredBy,
        scoredAt: new Date().toISOString(),
      };
    }
    const actualResult = Math.sign(finalScoreA - finalScoreB);
    let scored = 0;
    const preds = data.scorePredictions ?? [];
    for (let i = 0; i < preds.length; i++) {
      const p = preds[i];
      if (p.matchId !== matchId || p.pointsAwarded != null) continue;
      let pts: number;
      if (p.scoreA === finalScoreA && p.scoreB === finalScoreB) {
        pts = 3;
      } else if (Math.sign(p.scoreA - p.scoreB) === actualResult) {
        pts = 1;
      } else {
        pts = 0;
      }
      preds[i] = { ...p, pointsAwarded: pts };
      scored++;
    }
    await persist({ ...data, scoreMatches: matches, scorePredictions: preds });
    return { scored };
  },

  async resetMatchScoring(matchId) {
    const data = await load();
    const matches = (data.scoreMatches ?? []).map((m) =>
      m.matchId === matchId
        ? { ...smDefaults(m), finalScoreA: null, finalScoreB: null, scoredBy: null, scoredAt: null }
        : m,
    );
    let reset = 0;
    const now = new Date().toISOString();
    const preds = (data.scorePredictions ?? []).map((p) => {
      if (p.matchId === matchId && p.pointsAwarded != null) {
        reset++;
        return { ...p, pointsAwarded: null, updatedAt: now };
      }
      return p;
    });
    await persist({ ...data, scoreMatches: matches, scorePredictions: preds });
    return { reset };
  },

  async hasReceivedScoreEmail(participantId, templateId) {
    const data = await load();
    return (data.scoreEmailLog ?? []).some(
      (e) => e.participantId === participantId && e.templateId === templateId,
    );
  },

  async logScoreEmail(participantId, templateId, status) {
    const data = await load();
    const log = data.scoreEmailLog ?? [];
    const existing = log.findIndex(
      (e) => e.participantId === participantId && e.templateId === templateId,
    );
    if (existing >= 0) {
      log[existing] = { participantId, templateId, status };
    } else {
      log.push({ participantId, templateId, status });
    }
    await persist({ ...data, scoreEmailLog: log });
  },

  async getScoreEmailRecipients(templateId) {
    const data = await load();
    return new Set(
      (data.scoreEmailLog ?? [])
        .filter((e) => e.templateId === templateId)
        .map((e) => e.participantId),
    );
  },
};
