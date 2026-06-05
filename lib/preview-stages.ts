// Dev-only "tournament stage" presets for the preview panel. Plain data so both
// the client panel and the server action/clock can share it. Each stage pairs a
// simulated "now" (to move the date-driven UX) with how much of the bracket has
// resolved (to drive the leaderboard/scoring UX). Never used in production.

export type PreviewStageKey =
  | "pre"
  | "kickoff"
  | "groups"
  | "finalfour"
  | "champion";

export type PreviewStage = {
  key: PreviewStageKey;
  label: string;
  blurb: string;
  /** Simulated current time (ISO). null = real clock (genuinely pre-kickoff). */
  nowIso: string | null;
};

export const PREVIEW_STAGES: PreviewStage[] = [
  {
    key: "pre",
    label: "Pre-kickoff",
    blurb: "Bonus Picks open · countdown to kickoff",
    nowIso: null,
  },
  {
    key: "kickoff",
    label: "Just kicked off",
    blurb: "Picks locked · games underway · 0 pts yet",
    nowIso: "2026-06-11T21:00:00Z",
  },
  {
    key: "groups",
    label: "Group stage scored",
    blurb: "Group winners in · leaderboard live · R32 picks open",
    nowIso: "2026-06-28T10:00:00-04:00",
  },
  {
    key: "finalfour",
    label: "Final Four set",
    blurb: "Quarterfinals done · semifinalist points added",
    nowIso: "2026-07-12T12:00:00-04:00",
  },
  {
    key: "champion",
    label: "Champion crowned",
    blurb: "Final played · full scoring · tournament over",
    nowIso: "2026-07-20T12:00:00Z",
  },
];

export const PREVIEW_COOKIE = "copa_preview";

export function previewStage(key: string | null | undefined): PreviewStage | null {
  if (!key) return null;
  return PREVIEW_STAGES.find((s) => s.key === key) ?? null;
}
