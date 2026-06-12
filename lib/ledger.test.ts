import { describe, expect, it } from "vitest";
import { buildLedgerLines, shortDate } from "./ledger";
import type { ScoreLine, ScoreMatch, ScorePrediction } from "./types";

const match = (matchId: string, teamA: string, teamB: string, kickoffUtc: string): ScoreMatch => ({
  matchId,
  teamA,
  teamB,
  eligibleTeam: teamA,
  kickoffUtc,
  displayTimeEt: "",
  displayTimePt: "",
  finalScoreA: null,
  finalScoreB: null,
  providerFixtureId: null,
  scoredBy: null,
  scoredAt: null,
});

const pred = (matchId: string, pointsAwarded: number | null): ScorePrediction => ({
  id: matchId,
  participantId: "p",
  matchId,
  scoreA: 1,
  scoreB: 0,
  pointsAwarded,
  submittedAt: "",
  updatedAt: "",
});

describe("shortDate", () => {
  it("formats to month + day in US Eastern", () => {
    expect(shortDate("2026-06-11T19:00:00Z")).toBe("Jun 11");
    // 01:00Z on the 13th is the 12th in ET — the intuitive matchday.
    expect(shortDate("2026-06-13T01:00:00Z")).toBe("Jun 12");
  });
});

describe("buildLedgerLines", () => {
  const matches = [
    match("MEX_RSA", "Mexico", "South Africa", "2026-06-11T19:00:00Z"),
    match("USA_PAR", "USA", "Paraguay", "2026-06-13T01:00:00Z"),
  ];

  it("expands the score-pick lump into one line per scored match", () => {
    const scoreLines: ScoreLine[] = [{ label: "Score picks", points: 4, group: "score-pick" }];
    const preds = [pred("MEX_RSA", 3), pred("USA_PAR", 1)];
    const lines = buildLedgerLines(scoreLines, preds, matches);

    expect(lines).toEqual([
      { points: 3, text: "Exact score · Mexico vs South Africa · Jun 11", group: "score" },
      { points: 1, text: "Correct winner · USA vs Paraguay · Jun 12", group: "score" },
    ]);
  });

  it("keeps bracket/bonus/live labels and drops the aggregate score-pick line", () => {
    const scoreLines: ScoreLine[] = [
      { label: "Champion", points: 20, group: "bracket" },
      { label: "Golden Ball: Vinicius", points: 12, group: "bonus" },
      { label: "R16: Mexico ⚡", points: 4, group: "live" },
      { label: "Score picks", points: 3, group: "score-pick" },
    ];
    const lines = buildLedgerLines(scoreLines, [pred("MEX_RSA", 3)], matches);

    // Sorted by points desc; the "Score picks" lump is gone, replaced per-match.
    expect(lines.map((l) => `${l.points} ${l.group}`)).toEqual([
      "20 bracket",
      "12 bonus",
      "4 live",
      "3 score",
    ]);
    expect(lines.some((l) => l.text === "Score picks")).toBe(false);
  });

  it("excludes zero-point and unscored predictions", () => {
    const preds = [pred("MEX_RSA", 0), pred("USA_PAR", null)];
    expect(buildLedgerLines([], preds, matches)).toEqual([]);
  });

  it("excludes zero/negative engine lines", () => {
    const scoreLines: ScoreLine[] = [{ label: "Nothing", points: 0, group: "bracket" }];
    expect(buildLedgerLines(scoreLines, [], matches)).toEqual([]);
  });
});
