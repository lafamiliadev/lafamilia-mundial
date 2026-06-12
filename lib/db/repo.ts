import type { DailyPick, LivePick, Participant, Predictions, Results, ScoreMatch, ScorePrediction, Settings } from "../types";

export type CreateParticipantInput = {
  name: string;
  email: string;
  rootingCountry: string | null;
  crewCode: string | null;
  /** Optional free-text city (for community insights). */
  city?: string | null;
  /** Slug of the referrer whose share link brought this person in. */
  referredBy?: string | null;
  predictions: Predictions;
};

export type UpdateInput = {
  name?: string;
  rootingCountry?: string | null;
  city?: string | null;
  predictions?: Partial<Predictions>;
};

export type ScoreRow = {
  participantId: string;
  /** Per-competition slices (total = bracket + bonus + live + scorePick). */
  bracket: number;
  bonus: number;
  live: number;
  /** LatAm + Spain score prediction bonus — stored separately from bonus picks. */
  scorePick: number;
  total: number;
  rank: number;
  /** Rank at the previous scoring run — powers ▲/▼ movement (0 = no prior rank). */
  previousRank: number;
  /** Rank at the first scored run (group-stage end) — powers the Highest Climber award. */
  startRank: number;
};

export type ContentItem = {
  id: string;
  type: string;
  title: string;
  body: string;
  createdAt: string;
};

/**
 * Storage abstraction. Two implementations: an in-memory dev store (zero
 * config) and Supabase (production). All access is server-side only.
 */
export interface Repo {
  getSettings(): Promise<Settings>;
  saveSettings(settings: Settings): Promise<void>;

  countParticipants(): Promise<number>;
  createParticipant(input: CreateParticipantInput): Promise<Participant>;
  getByToken(token: string): Promise<Participant | null>;
  getByEmail(email: string): Promise<Participant | null>;
  getBySlug(slug: string): Promise<Participant | null>;
  updateByToken(token: string, input: UpdateInput): Promise<Participant | null>;
  listParticipants(): Promise<Participant[]>;

  /** Best-effort visit counter for a share page (real browsers only). */
  incrementReferralVisits(slug: string): Promise<void>;
  /** How many people submitted a bracket via this participant's link. */
  countReferralSignups(slug: string): Promise<number>;

  getResults(): Promise<Results>;
  saveResults(results: Results): Promise<void>;

  getScores(): Promise<Record<string, Omit<ScoreRow, "participantId">>>;
  saveScores(rows: ScoreRow[]): Promise<void>;

  // ── Live Picks (Phase 2 backend; empty until the tournament) ──
  getLivePicks(participantId: string): Promise<LivePick[]>;
  saveLivePicks(participantId: string, picks: LivePick[]): Promise<void>;
  /** All members' live picks, keyed by participant id — for scoring. */
  listLivePicks(): Promise<Record<string, LivePick[]>>;
  getDailyPicks(participantId: string): Promise<DailyPick[]>;
  saveDailyPicks(participantId: string, picks: DailyPick[]): Promise<void>;

  listContent(): Promise<ContentItem[]>;
  addContent(items: Omit<ContentItem, "id" | "createdAt">[]): Promise<void>;

  // ── Score Predictions (bonus pick of the day) ──
  getScoreMatches(): Promise<ScoreMatch[]>;
  /** Matches whose kickoff_utc is within the next `withinHours` hours and has not passed. */
  getUpcomingScoreMatches(nowIso: string, withinHours?: number): Promise<ScoreMatch[]>;
  getScoreMatch(matchId: string): Promise<ScoreMatch | null>;
  getScorePrediction(participantId: string, matchId: string): Promise<ScorePrediction | null>;
  /** All of one participant's score predictions — for their points ledger. */
  listScorePredictions(participantId: string): Promise<ScorePrediction[]>;
  /** Participant ids who have predicted a given match — to skip them in the
   * window-open email reminder. */
  getScorePredictionParticipantIds(matchId: string): Promise<string[]>;
  upsertScorePrediction(input: {
    participantId: string;
    matchId: string;
    scoreA: number;
    scoreB: number;
  }): Promise<ScorePrediction>;
  /** Sum of all awarded score prediction points per participant_id. */
  getScorePredictionTotals(): Promise<Record<string, number>>;
  /** How many predictions exist per match id — for the admin "who's affected" view. */
  getScorePredictionCounts(): Promise<Record<string, number>>;
  /** Link a score match to a provider fixture id (or null to unlink). Pure
   * metadata — never touches predictions or points. */
  linkScoreMatchFixture(matchId: string, providerFixtureId: string | null): Promise<void>;
  /**
   * Set the final score for a match and compute points_awarded for every
   * prediction on it. Idempotent: predictions where points_awarded is already
   * set are skipped. `scoredBy` records provenance (API-confirmed vs manual).
   * Returns the number of predictions scored.
   */
  scoreMatch(
    matchId: string,
    finalScoreA: number,
    finalScoreB: number,
    scoredBy: "api" | "admin",
  ): Promise<{ scored: number }>;
  /**
   * Undo scoring for ONE match: clear its final score + provenance and reset
   * points_awarded to null on its predictions, so a corrected score can be
   * re-applied cleanly. Scoped to this match only. Returns predictions cleared.
   */
  resetMatchScoring(matchId: string): Promise<{ reset: number }>;

  hasReceivedScoreEmail(participantId: string, templateId: string): Promise<boolean>;
  logScoreEmail(participantId: string, templateId: string, status: string): Promise<void>;
  /** All participant IDs that have already received a given email template. */
  getScoreEmailRecipients(templateId: string): Promise<Set<string>>;
}
