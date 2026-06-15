import "server-only";
import { supabaseAdmin } from "../supabase/admin";
import { baseSlug, uniqueSlug } from "../slug";
import { DEFAULT_SETTINGS, DEFAULT_WEIGHTS, EMPTY_RESULTS } from "../types";
import type { BonusPicks, DailyPick, LivePick, Participant, Predictions, Results, ScoreMatch, ScorePrediction, Settings } from "../types";
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
  city: string | null;
  created_at: string;
};

type PredictionRow = {
  participant_id: string;
  group_winners: Record<string, string> | null;
  semifinalists: string[] | null;
  champion: string | null;
  final_total_goals: number | null;
  bonus: BonusPicks | null;
};

function toPredictions(row?: PredictionRow | null): Predictions {
  return {
    groupWinners: row?.group_winners ?? null,
    semifinalists: row?.semifinalists ?? null,
    champion: row?.champion ?? null,
    finalTotalGoals: row?.final_total_goals ?? null,
    bonus: row?.bonus ?? null,
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
    city: row.city ?? null,
    createdAt: row.created_at,
    predictions: toPredictions(pred),
  };
}

function toScoreMatch(r: Record<string, unknown>): ScoreMatch {
  return {
    matchId: r.match_id as string,
    teamA: r.team_a as string,
    teamB: r.team_b as string,
    eligibleTeam: r.eligible_team as string,
    kickoffUtc: r.kickoff_utc as string,
    displayTimeEt: r.display_time_et as string,
    displayTimePt: r.display_time_pt as string,
    finalScoreA: r.final_score_a as number | null,
    finalScoreB: r.final_score_b as number | null,
    providerFixtureId: (r.provider_fixture_id as string | null) ?? null,
    scoredBy: (r.scored_by as "api" | "admin" | null) ?? null,
    scoredAt: (r.scored_at as string | null) ?? null,
  };
}

function toScorePrediction(r: Record<string, unknown>): ScorePrediction {
  return {
    id: r.id as string,
    participantId: r.participant_id as string,
    matchId: r.match_id as string,
    scoreA: r.score_a as number,
    scoreB: r.score_b as number,
    pointsAwarded: r.points_awarded as number | null,
    submittedAt: r.submitted_at as string,
    updatedAt: r.updated_at as string,
  };
}

function predictionColumns(participantId: string, p: Predictions): PredictionRow {
  return {
    participant_id: participantId,
    group_winners: p.groupWinners,
    semifinalists: p.semifinalists,
    champion: p.champion,
    final_total_goals: p.finalTotalGoals,
    bonus: p.bonus,
  };
}

export const supabaseRepo: Repo = {
  async getSettings() {
    const db = supabaseAdmin();
    const { data } = await db.from("settings").select("config").eq("id", 1).maybeSingle();
    const cfg = (data?.config as Settings | undefined) ?? DEFAULT_SETTINGS;
    // Merge over defaults so weights/fields added after the row was first written
    // (e.g. the Bonus/Live weights) always have a value — never undefined → NaN.
    return { ...DEFAULT_SETTINGS, ...cfg, weights: { ...DEFAULT_WEIGHTS, ...cfg.weights } };
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
          ...(input.city !== undefined ? { city: input.city } : {}),
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
          city: input.city ?? null,
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

    if (
      input.name !== undefined ||
      input.rootingCountry !== undefined ||
      input.city !== undefined
    ) {
      await db
        .from("participants")
        .update({
          ...(input.name !== undefined ? { name: input.name } : {}),
          ...(input.rootingCountry !== undefined
            ? { rooting_country: input.rootingCountry }
            : {}),
          ...(input.city !== undefined ? { city: input.city } : {}),
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
      const row = r as { bracket_points: number | null; bonus_points: number | null; live_points: number | null; score_pick_points: number | null; total: number; rank: number; previous_rank: number | null; start_rank: number | null; participant_id: string };
      out[row.participant_id] = {
        bracket: row.bracket_points ?? 0,
        bonus: row.bonus_points ?? 0,
        live: row.live_points ?? 0,
        scorePick: row.score_pick_points ?? 0,
        total: row.total,
        rank: row.rank,
        previousRank: row.previous_rank ?? 0,
        startRank: row.start_rank ?? 0,
      };
    }
    return out;
  },
  async saveScores(rows: ScoreRow[]) {
    const db = supabaseAdmin();
    await db.from("scores").upsert(
      rows.map((r) => ({
        participant_id: r.participantId,
        bracket_points: r.bracket,
        bonus_points: r.bonus,
        live_points: r.live,
        score_pick_points: r.scorePick,
        total: r.total,
        rank: r.rank,
        previous_rank: r.previousRank,
        start_rank: r.startRank,
      })),
      { onConflict: "participant_id" },
    );
  },

  async getLivePicks(participantId) {
    const db = supabaseAdmin();
    const { data } = await db.from("live_picks").select("picks").eq("participant_id", participantId).maybeSingle();
    return (data?.picks as LivePick[]) ?? [];
  },
  async saveLivePicks(participantId, picks) {
    const db = supabaseAdmin();
    await db.from("live_picks").upsert({ participant_id: participantId, picks }, { onConflict: "participant_id" });
  },
  async listLivePicks() {
    const db = supabaseAdmin();
    const { data } = await db.from("live_picks").select("participant_id, picks");
    const out: Record<string, LivePick[]> = {};
    for (const r of data ?? []) {
      const row = r as { participant_id: string; picks: LivePick[] };
      out[row.participant_id] = row.picks ?? [];
    }
    return out;
  },
  async getDailyPicks(participantId) {
    const db = supabaseAdmin();
    const { data } = await db.from("daily_picks").select("picks").eq("participant_id", participantId).maybeSingle();
    return (data?.picks as DailyPick[]) ?? [];
  },
  async saveDailyPicks(participantId, picks) {
    const db = supabaseAdmin();
    await db.from("daily_picks").upsert({ participant_id: participantId, picks }, { onConflict: "participant_id" });
  },

  async getScoreMatches() {
    const db = supabaseAdmin();
    const { data } = await db.from("score_matches").select("*").order("kickoff_utc", { ascending: true });
    return (data ?? []).map(toScoreMatch);
  },

  async getUpcomingScoreMatches(nowIso, withinHours = 24) {
    const db = supabaseAdmin();
    const cutoff = new Date(new Date(nowIso).getTime() + withinHours * 60 * 60 * 1000).toISOString();
    const { data } = await db
      .from("score_matches")
      .select("*")
      .gt("kickoff_utc", nowIso)
      .lte("kickoff_utc", cutoff)
      .order("kickoff_utc", { ascending: true });
    return (data ?? []).map(toScoreMatch);
  },

  async getScoreMatch(matchId) {
    const db = supabaseAdmin();
    const { data } = await db.from("score_matches").select("*").eq("match_id", matchId).maybeSingle();
    return data ? toScoreMatch(data) : null;
  },

  async getScorePrediction(participantId, matchId) {
    const db = supabaseAdmin();
    const { data } = await db
      .from("score_predictions")
      .select("*")
      .eq("participant_id", participantId)
      .eq("match_id", matchId)
      .maybeSingle();
    return data ? toScorePrediction(data) : null;
  },

  async upsertScorePrediction({ participantId, matchId, scoreA, scoreB }) {
    const db = supabaseAdmin();
    const { data, error } = await db
      .from("score_predictions")
      .upsert(
        {
          participant_id: participantId,
          match_id: matchId,
          score_a: scoreA,
          score_b: scoreB,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "participant_id,match_id" },
      )
      .select()
      .single();
    if (error || !data) throw error ?? new Error("Failed to save score prediction");
    return toScorePrediction(data);
  },

  async listScorePredictions(participantId) {
    const db = supabaseAdmin();
    const { data } = await db
      .from("score_predictions")
      .select("*")
      .eq("participant_id", participantId);
    return (data ?? []).map(toScorePrediction);
  },

  async getScorePredictionParticipantIds(matchId) {
    const db = supabaseAdmin();
    const { data } = await db
      .from("score_predictions")
      .select("participant_id")
      .eq("match_id", matchId);
    return (data ?? []).map((r) => (r as { participant_id: string }).participant_id);
  },

  async getMatchScorePredictions(matchId) {
    const db = supabaseAdmin();
    const { data } = await db
      .from("score_predictions")
      .select("participant_id, score_a, score_b, points_awarded")
      .eq("match_id", matchId);
    const rows = (data ?? []) as {
      participant_id: string;
      score_a: number;
      score_b: number;
      points_awarded: number | null;
    }[];
    if (rows.length === 0) return [];
    const { data: people } = await db
      .from("participants")
      .select("id, name, slug, rooting_country")
      .in("id", rows.map((r) => r.participant_id));
    const byId = new Map(
      ((people ?? []) as { id: string; name: string; slug: string; rooting_country: string | null }[]).map(
        (p) => [p.id, p],
      ),
    );
    return rows.map((r) => {
      const p = byId.get(r.participant_id);
      return {
        participantId: r.participant_id,
        name: p?.name ?? "Anónimo",
        slug: p?.slug ?? "",
        rootingCountry: p?.rooting_country ?? null,
        scoreA: r.score_a,
        scoreB: r.score_b,
        pointsAwarded: r.points_awarded,
      };
    });
  },

  async getAllScorePredictions() {
    const db = supabaseAdmin();
    const { data } = await db
      .from("score_predictions")
      .select("match_id, participant_id, score_a, score_b, points_awarded");
    const rows = (data ?? []) as {
      match_id: string;
      participant_id: string;
      score_a: number;
      score_b: number;
      points_awarded: number | null;
    }[];
    if (rows.length === 0) return [];
    const { data: people } = await db
      .from("participants")
      .select("id, name, slug, rooting_country")
      .in("id", [...new Set(rows.map((r) => r.participant_id))]);
    const byId = new Map(
      ((people ?? []) as { id: string; name: string; slug: string; rooting_country: string | null }[]).map(
        (p) => [p.id, p],
      ),
    );
    return rows.map((r) => {
      const p = byId.get(r.participant_id);
      return {
        matchId: r.match_id,
        participantId: r.participant_id,
        name: p?.name ?? "Anónimo",
        slug: p?.slug ?? "",
        rootingCountry: p?.rooting_country ?? null,
        scoreA: r.score_a,
        scoreB: r.score_b,
        pointsAwarded: r.points_awarded,
      };
    });
  },

  async getScorePredictionTotals() {
    const db = supabaseAdmin();
    const { data } = await db
      .from("score_predictions")
      .select("participant_id, points_awarded")
      .not("points_awarded", "is", null);
    const totals: Record<string, number> = {};
    for (const r of data ?? []) {
      const row = r as { participant_id: string; points_awarded: number };
      totals[row.participant_id] = (totals[row.participant_id] ?? 0) + (row.points_awarded ?? 0);
    }
    return totals;
  },

  async getScorePredictionCounts() {
    const db = supabaseAdmin();
    const { data } = await db.from("score_predictions").select("match_id");
    const counts: Record<string, number> = {};
    for (const r of data ?? []) {
      const row = r as { match_id: string };
      counts[row.match_id] = (counts[row.match_id] ?? 0) + 1;
    }
    return counts;
  },

  async linkScoreMatchFixture(matchId, providerFixtureId) {
    const db = supabaseAdmin();
    await db
      .from("score_matches")
      .update({ provider_fixture_id: providerFixtureId })
      .eq("match_id", matchId);
  },

  async scoreMatch(matchId, finalScoreA, finalScoreB, scoredBy) {
    const db = supabaseAdmin();
    // Store the final score + provenance.
    await db
      .from("score_matches")
      .update({
        final_score_a: finalScoreA,
        final_score_b: finalScoreB,
        scored_by: scoredBy,
        scored_at: new Date().toISOString(),
      })
      .eq("match_id", matchId);
    // Fetch all unscored predictions for this match.
    const { data: preds } = await db
      .from("score_predictions")
      .select("id, score_a, score_b")
      .eq("match_id", matchId)
      .is("points_awarded", null);
    if (!preds || preds.length === 0) return { scored: 0 };
    const actualResult = Math.sign(finalScoreA - finalScoreB);
    let scored = 0;
    for (const p of preds) {
      const pred = p as { id: string; score_a: number; score_b: number };
      let pts: number;
      if (pred.score_a === finalScoreA && pred.score_b === finalScoreB) {
        pts = 3;
      } else if (Math.sign(pred.score_a - pred.score_b) === actualResult) {
        pts = 1;
      } else {
        pts = 0;
      }
      await db.from("score_predictions").update({ points_awarded: pts }).eq("id", pred.id);
      scored++;
    }
    return { scored };
  },

  async resetMatchScoring(matchId) {
    const db = supabaseAdmin();
    // Clear the final score + provenance on the match.
    await db
      .from("score_matches")
      .update({ final_score_a: null, final_score_b: null, scored_by: null, scored_at: null })
      .eq("match_id", matchId);
    // Reset points only on this match's already-scored predictions.
    const { data: preds } = await db
      .from("score_predictions")
      .select("id")
      .eq("match_id", matchId)
      .not("points_awarded", "is", null);
    const ids = (preds ?? []).map((p) => (p as { id: string }).id);
    if (ids.length === 0) return { reset: 0 };
    await db
      .from("score_predictions")
      .update({ points_awarded: null, updated_at: new Date().toISOString() })
      .in("id", ids);
    return { reset: ids.length };
  },

  async hasReceivedScoreEmail(participantId, templateId) {
    const db = supabaseAdmin();
    const { data } = await db
      .from("score_email_log")
      .select("id")
      .eq("participant_id", participantId)
      .eq("template_id", templateId)
      .maybeSingle();
    return Boolean(data);
  },

  async logScoreEmail(participantId, templateId, status) {
    const db = supabaseAdmin();
    await db
      .from("score_email_log")
      .upsert({ participant_id: participantId, template_id: templateId, status }, { onConflict: "participant_id,template_id" });
  },

  async getScoreEmailRecipients(templateId) {
    const db = supabaseAdmin();
    // Only people who were SUCCESSFULLY emailed count as done — so a failed send
    // (e.g. rate-limited) is retried on the next run instead of skipped forever.
    const { data } = await db
      .from("score_email_log")
      .select("participant_id")
      .eq("template_id", templateId)
      .eq("status", "sent");
    return new Set((data ?? []).map((r) => (r as { participant_id: string }).participant_id));
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
