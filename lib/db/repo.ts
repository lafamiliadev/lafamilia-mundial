import type { Participant, Predictions, Results, Settings } from "../types";

export type CreateParticipantInput = {
  name: string;
  email: string;
  rootingCountry: string | null;
  crewCode: string | null;
  predictions: Predictions;
};

export type UpdateInput = {
  name?: string;
  rootingCountry?: string | null;
  predictions?: Partial<Predictions>;
};

export type ScoreRow = {
  participantId: string;
  base: number;
  bonus: number;
  total: number;
  rank: number;
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
  updateByToken(token: string, input: UpdateInput): Promise<Participant | null>;
  listParticipants(): Promise<Participant[]>;

  getResults(): Promise<Results>;
  saveResults(results: Results): Promise<void>;

  getScores(): Promise<Record<string, Omit<ScoreRow, "participantId">>>;
  saveScores(rows: ScoreRow[]): Promise<void>;

  listContent(): Promise<ContentItem[]>;
  addContent(items: Omit<ContentItem, "id" | "createdAt">[]): Promise<void>;
}
