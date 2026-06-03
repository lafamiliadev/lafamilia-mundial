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

export type ScoringWeights = {
  /** Per correctly-predicted group winner (12 groups). */
  groupWinner: number;
  /** Per correctly-predicted semifinalist (your Final Four). */
  semifinalist: number;
  /** Correct champion. */
  champion: number;
  /** Bonus for nailing all 12 group winners. */
  groupSweepBonus: number;
};

export const DEFAULT_WEIGHTS: ScoringWeights = {
  groupWinner: 3, // max 36 across 12 groups
  semifinalist: 10, // max 40 across 4 picks
  champion: 20,
  groupSweepBonus: 10,
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

export type Predictions = {
  /** Group letter → predicted winning team code (12 entries when complete). */
  groupWinners: Record<string, string> | null;
  /** The 4 teams predicted to reach the semifinals ("Final Four"). */
  semifinalists: string[] | null;
  /** Champion — must be one of the four semifinalists. */
  champion: string | null;
  /** Tiebreaker: total goals scored in the final. */
  finalTotalGoals: number | null;
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
};

export const EMPTY_RESULTS: Results = {
  champion: null,
  groupWinners: {},
  stageReached: {},
};

export type ScoreBreakdown = {
  participantId: string;
  base: number;
  bonus: number;
  total: number;
  lines: { label: string; points: number }[];
};

export type LeaderboardRow = {
  rank: number;
  name: string;
  /** Public handle → /copa/[slug], so rows link to each member's bracket. */
  slug: string;
  rootingCountry: string | null;
  total: number;
  /** Rank change since the last scoring run: + climbed, − dropped, 0 = none/new. */
  delta?: number;
  isMe?: boolean;
};
