// Shared domain types across the app.

export type Stage = "r16" | "qf" | "sf" | "final" | "champion";

export type ScoringWeights = {
  champion: number;
  runnerUp: number;
  goldenBoot: number;
  darkHorse: number;
  latamFurthest: number;
  bonusR16: number;
  bonusQf: number;
  bonusSf: number;
  bonusFinalist: number;
  bonusChampion: number;
};

export const DEFAULT_WEIGHTS: ScoringWeights = {
  champion: 25,
  runnerUp: 15,
  goldenBoot: 15,
  darkHorse: 10,
  latamFurthest: 15,
  bonusR16: 5,
  bonusQf: 5,
  bonusSf: 10,
  bonusFinalist: 10,
  bonusChampion: 25,
};

export type Settings = {
  weights: ScoringWeights;
  lockTime: string; // ISO timestamp — predictions lock at first kickoff
  tournamentStage: "pre" | Stage | "done";
  /** Min FIFA seed tier a Dark Horse pick must be to qualify (4 = only true outsiders). */
  darkHorseMinSeed: number;
  /** Stage a Dark Horse pick must reach to score (default qf). */
  darkHorseReachStage: Stage;
};

export const DEFAULT_SETTINGS: Settings = {
  weights: DEFAULT_WEIGHTS,
  lockTime: "2026-06-11T20:00:00Z", // WC2026 opening match
  tournamentStage: "pre",
  darkHorseMinSeed: 3,
  darkHorseReachStage: "qf",
};

export type Predictions = {
  champion: string | null; // team code
  runnerUp: string | null;
  goldenBoot: string | null; // player id
  darkHorse: string | null; // team code
  latamFurthest: string | null; // team code
  finalTotalGoals: number | null; // tiebreaker
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
  runnerUp: string | null;
  goldenBoot: string | null; // player id
  latamFurthest: string | null;
  darkHorseTeam: string | null; // optional explicit override
  /** Which teams reached each stage — drives progressive bonus scoring. */
  stageReached: Partial<Record<Stage, string[]>>;
};

export const EMPTY_RESULTS: Results = {
  champion: null,
  runnerUp: null,
  goldenBoot: null,
  latamFurthest: null,
  darkHorseTeam: null,
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
  rootingCountry: string | null;
  total: number;
  isMe?: boolean;
};
