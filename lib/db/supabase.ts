import "server-only";
import { supabaseAdmin } from "../supabase/admin";
import { baseSlug, uniqueSlug } from "../slug";
import { DEFAULT_SETTINGS, EMPTY_RESULTS } from "../types";
import type { Participant, Predictions, Results, Settings } from "../types";
import type {
  ContentItem,
  CreateParticipantInput,
  Repo,
  ScoreRow,
  UpdateInput,
} from "./repo";

// Supabase-backed repository. Schema lives in supabase/migrations/0001_init.sql.
// Predictions are stored as columns on the `predictions` table (1:1 participant).

type ParticipantRow = {
  id: string;
  name: string;
  email: string;
  rooting_country: string | null;
  resume_token: string;
  slug: string;
  referred_by: string | null;
  referral_visits: number | null;
  crew_code: string | null;
  created_at: string;
};

type PredictionRow = {
  participant_id: string;
  group_winners: Record<string, string> | null;
  semifinalists: string[] | null;
  champion: string | null;
  final_total_goals: number | null;
};

function toPredictions(row?: PredictionRow | null): Predictions {
  return {
    groupWinners: row?.group_winners ?? null,
    semifinalists: row?.semifinalists ?? null,
    champion: row?.champion ?? null,
    finalTotalGoals: row?.final_total_goals ?? null,
  };
}

function toParticipant(row: ParticipantRow, pred?: PredictionRow | null): Participant {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    rootingCountry: row.rooting_country,
    resumeToken: row.resume_token,
    slug: row.slug,
    referredBy: row.referred_by,
    referralVisits: row.referral_visits ?? 0,
    crewCode: row.crew_code,
    createdAt: row.created_at,
    predictions: toPredictions(pred),
  };
}

function predictionColumns(participantId: string, p: Predictions): PredictionRow {
  return {
    participant_id: participantId,
    group_winners: p.groupWinners,
    semifinalists: p.semifinalists,
    champion: p.champion,
    final_total_goals: p.finalTotalGoals,
  };
}

export const supabaseRepo: Repo = {
  async getSettings() {
    const db = supabaseAdmin();
    const { data } = await db.from("settings").select("config").eq("id", 1).maybeSingle();
    return (data?.config as Settings) ?? DEFAULT_SETTINGS;
  },
  async saveSettings(settings) {
    const db = supabaseAdmin();
    await db.from("settings").upsert({ id: 1, config: settings });
  },

  async countParticipants() {
    const db = supabaseAdmin();
    const { count } = await db
      .from("participants")
      .select("id", { count: "exact", head: true });
    return count ?? 0;
  },

  async createParticipant(input: CreateParticipantInput) {
    const db = supabaseAdmin();
    const email = input.email.toLowerCase();

    const existing = await this.getByEmail(email);
    let row: ParticipantRow;
    if (existing) {
      // Edit existing entry; preserve slug, referral attribution, visits, token.
      const { data, error } = await db
        .from("participants")
        .update({
          name: input.name,
          rooting_country: input.rootingCountry,
          crew_code: input.crewCode,
        })
        .eq("id", existing.id)
        .select()
        .single();
      if (error || !data) throw error ?? new Error("Failed to update participant");
      row = data as ParticipantRow;
    } else {
      const slug = await uniqueSlug(baseSlug(input.name), async (s) => {
        const { data } = await db
          .from("participants")
          .select("id")
          .eq("slug", s)
          .maybeSingle();
        return Boolean(data);
      });
      const { data, error } = await db
        .from("participants")
        .insert({
          name: input.name,
          email,
          rooting_country: input.rootingCountry,
          crew_code: input.crewCode,
          slug,
          referred_by: input.referredBy ?? null,
        })
        .select()
        .single();
      if (error || !data) throw error ?? new Error("Failed to create participant");
      row = data as ParticipantRow;
    }

    await db
      .from("predictions")
      .upsert(predictionColumns(row.id, input.predictions), {
        onConflict: "participant_id",
      });

    return toParticipant(row, predictionColumns(row.id, input.predictions));
  },

  async getByToken(token) {
    const db = supabaseAdmin();
    const { data: row } = await db
      .from("participants")
      .select("*")
      .eq("resume_token", token)
      .maybeSingle();
    if (!row) return null;
    const { data: pred } = await db
      .from("predictions")
      .select("*")
      .eq("participant_id", row.id)
      .maybeSingle();
    return toParticipant(row as ParticipantRow, pred as PredictionRow | null);
  },

  async getByEmail(email) {
    const db = supabaseAdmin();
    const { data: row } = await db
      .from("participants")
      .select("*")
      .eq("email", email.toLowerCase())
      .maybeSingle();
    if (!row) return null;
    const { data: pred } = await db
      .from("predictions")
      .select("*")
      .eq("participant_id", row.id)
      .maybeSingle();
    return toParticipant(row as ParticipantRow, pred as PredictionRow | null);
  },

  async getBySlug(slug) {
    const db = supabaseAdmin();
    const { data: row } = await db
      .from("participants")
      .select("*")
      .eq("slug", slug)
      .maybeSingle();
    if (!row) return null;
    const { data: pred } = await db
      .from("predictions")
      .select("*")
      .eq("participant_id", row.id)
      .maybeSingle();
    return toParticipant(row as ParticipantRow, pred as PredictionRow | null);
  },

  async incrementReferralVisits(slug) {
    const db = supabaseAdmin();
    // Atomic increment via RPC; falls back to read-modify-write if absent.
    const { error } = await db.rpc("increment_referral_visits", { p_slug: slug });
    if (error) {
      const { data } = await db
        .from("participants")
        .select("referral_visits")
        .eq("slug", slug)
        .maybeSingle();
      if (data) {
        await db
          .from("participants")
          .update({ referral_visits: (data.referral_visits ?? 0) + 1 })
          .eq("slug", slug);
      }
    }
  },

  async countReferralSignups(slug) {
    const db = supabaseAdmin();
    const { count } = await db
      .from("participants")
      .select("id", { count: "exact", head: true })
      .eq("referred_by", slug);
    return count ?? 0;
  },

  async updateByToken(token, input: UpdateInput) {
    const db = supabaseAdmin();
    const current = await this.getByToken(token);
    if (!current) return null;

    if (input.name !== undefined || input.rootingCountry !== undefined) {
      await db
        .from("participants")
        .update({
          ...(input.name !== undefined ? { name: input.name } : {}),
          ...(input.rootingCountry !== undefined
            ? { rooting_country: input.rootingCountry }
            : {}),
        })
        .eq("id", current.id);
    }
    if (input.predictions) {
      const merged = { ...current.predictions, ...input.predictions };
      await db
        .from("predictions")
        .upsert(predictionColumns(current.id, merged), {
          onConflict: "participant_id",
        });
    }
    return this.getByToken(token);
  },

  async listParticipants() {
    const db = supabaseAdmin();
    const { data: rows } = await db
      .from("participants")
      .select("*")
      .order("created_at", { ascending: true });
    const { data: preds } = await db.from("predictions").select("*");
    const predByPid = new Map(
      (preds ?? []).map((p) => [(p as PredictionRow).participant_id, p as PredictionRow]),
    );
    return (rows ?? []).map((r) =>
      toParticipant(r as ParticipantRow, predByPid.get((r as ParticipantRow).id)),
    );
  },

  async getResults() {
    const db = supabaseAdmin();
    const { data } = await db.from("results").select("data").eq("id", 1).maybeSingle();
    return (data?.data as Results) ?? EMPTY_RESULTS;
  },
  async saveResults(results: Results) {
    const db = supabaseAdmin();
    await db.from("results").upsert({ id: 1, data: results });
  },

  async getScores() {
    const db = supabaseAdmin();
    const { data } = await db.from("scores").select("*");
    const out: Record<string, Omit<ScoreRow, "participantId">> = {};
    for (const r of data ?? []) {
      const row = r as { base: number; bonus: number; total: number; rank: number; previous_rank: number | null; participant_id: string };
      out[row.participant_id] = {
        base: row.base,
        bonus: row.bonus,
        total: row.total,
        rank: row.rank,
        previousRank: row.previous_rank ?? 0,
      };
    }
    return out;
  },
  async saveScores(rows: ScoreRow[]) {
    const db = supabaseAdmin();
    await db.from("scores").upsert(
      rows.map((r) => ({
        participant_id: r.participantId,
        base: r.base,
        bonus: r.bonus,
        total: r.total,
        rank: r.rank,
        previous_rank: r.previousRank,
      })),
      { onConflict: "participant_id" },
    );
  },

  async listContent() {
    const db = supabaseAdmin();
    const { data } = await db
      .from("community_content")
      .select("*")
      .order("created_at", { ascending: false });
    return (data ?? []).map((r) => {
      const row = r as { id: string; type: string; title: string; body: string; created_at: string };
      return {
        id: row.id,
        type: row.type,
        title: row.title,
        body: row.body,
        createdAt: row.created_at,
      } satisfies ContentItem;
    });
  },
  async addContent(items) {
    const db = supabaseAdmin();
    await db.from("community_content").insert(
      items.map((i) => ({ type: i.type, title: i.title, body: i.body })),
    );
  },
};
