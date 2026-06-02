import { promises as fs } from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { DEFAULT_SETTINGS, EMPTY_RESULTS } from "../types";
import { baseSlug, uniqueSlug } from "../slug";
import type { Participant, Results, Settings } from "../types";
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
  content: ContentItem[];
};

const DATA_DIR = path.join(process.cwd(), ".data");
const DATA_FILE = path.join(DATA_DIR, "dev.json");

const EMPTY_SHAPE = (): Shape => ({
  settings: DEFAULT_SETTINGS,
  participants: [],
  results: EMPTY_RESULTS,
  scores: {},
  content: [],
});

// Backfill fields added after some dev entries were already written, so old
// .data/dev.json files keep working (and existing resume links stay valid).
function normalize(data: Shape): { data: Shape; mutated: boolean } {
  let mutated = false;
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

export const memoryRepo: Repo = {
  async getSettings() {
    return (await load()).settings;
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
      scores[r.participantId] = { base: r.base, bonus: r.bonus, total: r.total, rank: r.rank };
    }
    await persist({ ...data, scores });
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
};
