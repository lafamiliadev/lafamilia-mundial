import "server-only";
import { supabaseAdmin } from "../supabase/admin";
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
  crew_code: string | null;
  created_at: string;
};

type PredictionRow = {
  participant_id: string;
  champion: string | null;
  runner_up: string | null;
  golden_boot: string | null;
  dark_horse: string | null;
  latam_furthest: string | null;
  final_total_goals: number | null;
};

function toPredictions(row?: PredictionRow | null): Predictions {
  return {
    champion: row?.champion ?? null,
    runnerUp: row?.runner_up ?? null,
    goldenBoot: row?.golden_boot ?? null,
    darkHorse: row?.dark_horse ?? null,
    latamFurthest: row?.latam_furthest ?? null,
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
    crewCode: row.crew_code,
    createdAt: row.created_at,
    predictions: toPredictions(pred),
  };
}

function predictionColumns(participantId: string, p: Predictions): PredictionRow {
  return {
    participant_id: participantId,
    champion: p.champion,
    runner_up: p.runnerUp,
    golden_boot: p.goldenBoot,
    dark_horse: p.darkHorse,
    latam_furthest: p.latamFurthest,
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
    const { data: row, error } = await db
      .from("participants")
      .upsert(
        {
          name: input.name,
          email,
          rooting_country: input.rootingCountry,
          crew_code: input.crewCode,
        },
        { onConflict: "email" },
      )
      .select()
      .single();
    if (error || !row) throw error ?? new Error("Failed to create participant");

    await db
      .from("predictions")
      .upsert(predictionColumns(row.id, input.predictions), {
        onConflict: "participant_id",
      });

    return toParticipant(row as ParticipantRow, predictionColumns(row.id, input.predictions));
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
      const row = r as ScoreRow & { participant_id: string };
      out[row.participant_id] = {
        base: row.base,
        bonus: row.bonus,
        total: row.total,
        rank: row.rank,
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
