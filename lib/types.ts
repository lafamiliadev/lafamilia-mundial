// Shared domain types across the app.

export type Stage = "r16" | "qf" | "sf" | "final" | "champion";

/** The 12 World Cup 2026 groups. */
export const GROUP_LETTERS = [
  "A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L",
] as const;
export type GroupLetter = (typeof GROUP_LETTERS)[number];

/** Group composition: group letter → the (4) team codes drawn into it. Synced
 * from the football provider (source of truth), never hardcoded. */
export type GroupMap = Record<string, string[]>;

/** Knockout rounds for the Live Picks competition (note: includes r32). */
export const KNOCKOUT_ROUNDS = ["r32", "r16", "qf", "sf", "final"] as const;
export type KnockoutRound = (typeof KNOCKOUT_ROUNDS)[number];

export type ScoringWeights = {
  // ── Original bracket ──
  groupWinner: number; // per group winner (12 groups)
  semifinalist: number; // per Final Four team
  champion: number;
  groupSweepBonus: number; // all 12 group winners
  // ── Bonus Picks ──
  goldenBall: number;
  goldenBoot: number;
  goldenGlove: number;
  darkHorseR16: number; // Dark Horse by furthest stage (totals, not additive)
  darkHorseQf: number;
  darkHorseSf: number;
  // ── Live Knockout Picks (per correct match winner, by round) ──
  liveR32: number;
  liveR16: number;
  liveQf: number;
  liveSf: number;
  liveFinal: number;
};

export const DEFAULT_WEIGHTS: ScoringWeights = {
  groupWinner: 3, // max 36 across 12 groups
  semifinalist: 10, // max 40 across 4 picks
  champion: 20,
  groupSweepBonus: 10,
  goldenBall: 12,
  goldenBoot: 12,
  goldenGlove: 8,
  darkHorseR16: 3,
  darkHorseQf: 7,
  darkHorseSf: 12,
  liveR32: 1,
  liveR16: 2,
  liveQf: 4,
  liveSf: 8,
  liveFinal: 16,
};

/** Points for a correct Live Pick in a given round. */
export const LIVE_ROUND_POINTS: Record<KnockoutRound, keyof ScoringWeights> = {
  r32: "liveR32",
  r16: "liveR16",
  qf: "liveQf",
  sf: "liveSf",
  final: "liveFinal",
};

export type Settings = {
  weights: ScoringWeights;
  lockTime: string; // ISO timestamp — predictions lock at first kickoff
  tournamentStage: "pre" | Stage | "done";
  /** Cached group composition, synced from the active provider (source of truth). */
  groups: GroupMap;
  /** When groups were last synced from the provider (ISO), or null. */
  groupsSyncedAt: string | null;
  /** When true, the La Familia Honors (awards) are public on /awards. */
  awardsRevealed: boolean;
};

export const DEFAULT_SETTINGS: Settings = {
  weights: DEFAULT_WEIGHTS,
  lockTime: "2026-06-11T20:00:00Z", // WC2026 opening match
  tournamentStage: "pre",
  groups: {},
  groupsSyncedAt: null,
  awardsRevealed: false,
};

/** The four pre-tournament Bonus Picks (the expected "second step" after the
 * bracket; they count toward the Overall leaderboard). */
export type BonusPicks = {
  goldenBall: string | null; // player id — best player
  goldenBoot: string | null; // player id — top scorer
  goldenGlove: string | null; // player id — best goalkeeper
  darkHorse: string | null; // team code — surprise team (fixed eligible list)
};

export const EMPTY_BONUS: BonusPicks = {
  goldenBall: null,
  goldenBoot: null,
  goldenGlove: null,
  darkHorse: null,
};

export type Predictions = {
  /** Group letter → predicted winning team code (12 entries when complete). */
  groupWinners: Record<string, string> | null;
  /** The 4 teams predicted to reach the semifinals ("Final Four"). */
  semifinalists: string[] | null;
  /** Champion — must be one of the four semifinalists. */
  champion: string | null;
  /** Tiebreaker: total goals scored in the final. */
  finalTotalGoals: number | null;
  /** Optional Bonus Picks (Golden Ball/Boot/Glove + Dark Horse). */
  bonus: BonusPicks | null;
};

/** A Live Knockout Pick — the winner of a specific knockout match (Phase 2). */
export type LivePick = {
  matchId: string;
  round: KnockoutRound;
  team: string; // picked team code
  highConviction: boolean; // doubles this match if correct (1 per round)
};

/** La Jugada del Día — a one-tap daily group-stage prediction (Phase 2). */
export type DailyPick = {
  day: string; // YYYY-MM-DD
  matchId: string;
  pick: "home" | "draw" | "away";
};

export type Participant = {
  id: string;
  name: string;
  email: string;
  rootingCountry: string | null;
  resumeToken: string;
  /** Public, human-readable handle for the share page: /copa/<slug>. */
  slug: string;
  /** Slug of the participant whose link brought them in (referral attribution). */
  referredBy: string | null;
  /** Approximate count of real-browser visits to this participant's share page. */
  referralVisits: number;
  crewCode: string | null;
  createdAt: string;
  predictions: Predictions;
};

// Public-facing entry (no email/token) — what views/leaderboard expose.
export type PublicEntry = {
  id: string;
  name: string;
  rootingCountry: string | null;
  predictions: Predictions;
};

export type Results = {
  champion: string | null;
  /** Actual group winners: group letter → winning team code (rank 1). */
  groupWinners: Record<string, string>;
  /** Which teams reached each stage. Semifinalists = stageReached.sf. */
  stageReached: Partial<Record<Stage, string[]>>;
  // ── Bonus Picks results (player ids) ──
  goldenBall: string | null;
  goldenBoot: string | null;
  goldenGlove: string | null;
  // ── Live Knockout results: match id → winning team code (Phase 2) ──
  matchWinners: Record<string, string>;
};

export const EMPTY_RESULTS: Results = {
  champion: null,
  groupWinners: {},
  stageReached: {},
  goldenBall: null,
  goldenBoot: null,
  goldenGlove: null,
  matchWinners: {},
};

/** Per-competition slice of a participant's score. */
export type ScoreLine = { label: string; points: number; group: "bracket" | "bonus" | "live" };

export type ScoreResult = {
  bracket: number; // original bracket points
  bonus: number; // bonus picks points
  live: number; // live knockout points
  total: number;
  lines: ScoreLine[];
};

export type LeaderboardRow = {
  rank: number;
  name: string;
  /** Public handle → /copa/[slug], so rows link to each member's bracket. */
  slug: string;
  rootingCountry: string | null;
  /** Their pick to win it all (the headline bet shown on the board). */
  champion: string | null;
  total: number;
  /** Rank change since the last scoring run: + climbed, − dropped, 0 = none/new. */
  delta?: number;
  isMe?: boolean;
};
