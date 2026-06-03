// Scoring milestones — the moments points land on the leaderboard, used to fuel
// anticipation ("next points drop"). Dates follow the official FIFA World Cup
// 2026 schedule (group stage Jun 11–27; final Jul 19). These are fixed, public
// fixtures — the countdown just teases when the board will move next.

export type ScoringMilestone = {
  /** Short label for the banner. */
  label: string;
  /** When the points become live (ISO, with timezone). */
  dateIso: string;
  /** How many points are in play at this milestone (across all 12 groups, etc.). */
  pointsInPlay: number;
};

export const SCORING_MILESTONES: ScoringMilestone[] = [
  // Group winners are decided when the group stage finishes.
  { label: "Group stage finishes", dateIso: "2026-06-27T23:59:00-04:00", pointsInPlay: 36 },
  // Your Final Four is locked once the quarterfinals are played.
  { label: "Final Four is set", dateIso: "2026-07-11T23:59:00-04:00", pointsInPlay: 40 },
  // Champion (and the goals tiebreaker) resolves at the final.
  { label: "The Final", dateIso: "2026-07-19T23:59:00-04:00", pointsInPlay: 20 },
];

/** The next milestone strictly after `now`, or null if the tournament is done. */
export function nextScoringMilestone(now: Date): ScoringMilestone | null {
  for (const m of SCORING_MILESTONES) {
    if (new Date(m.dateIso).getTime() > now.getTime()) return m;
  }
  return null;
}
