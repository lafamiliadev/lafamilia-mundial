import { describe, expect, it } from "vitest";
import { rankParticipants, scorePredictions } from "./scoring";
import { DEFAULT_SETTINGS, EMPTY_RESULTS } from "./types";
import type { Predictions, Results } from "./types";

const blankPrediction: Predictions = {
  groupWinners: null,
  semifinalists: null,
  champion: null,
  finalTotalGoals: null,
};

const W = DEFAULT_SETTINGS.weights;

// Helper: full 12-group winners map A→L from a list of codes.
const LETTERS = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L"];
function groups(codes: string[]): Record<string, string> {
  const out: Record<string, string> = {};
  codes.forEach((c, i) => (out[LETTERS[i]] = c));
  return out;
}

describe("scorePredictions — group winners", () => {
  it("awards nothing on an empty card", () => {
    const r = scorePredictions(blankPrediction, EMPTY_RESULTS, DEFAULT_SETTINGS);
    expect(r.total).toBe(0);
  });

  it("awards per correct group winner only for decided groups", () => {
    const picks = groups(["BRA", "ARG", "FRA", "ESP"]);
    const predictions: Predictions = { ...blankPrediction, groupWinners: picks };
    // Only groups A and B are decided; A correct, B wrong.
    const results: Results = {
      ...EMPTY_RESULTS,
      groupWinners: { A: "BRA", B: "GER" },
    };
    const r = scorePredictions(predictions, results, DEFAULT_SETTINGS);
    expect(r.base).toBe(W.groupWinner); // only group A
  });

  it("adds a clean-sweep bonus when all 12 are decided and correct", () => {
    const codes = ["BRA", "ARG", "FRA", "ESP", "ENG", "POR", "NED", "GER", "MEX", "USA", "JPN", "MAR"];
    const predictions: Predictions = { ...blankPrediction, groupWinners: groups(codes) };
    const results: Results = { ...EMPTY_RESULTS, groupWinners: groups(codes) };
    const r = scorePredictions(predictions, results, DEFAULT_SETTINGS);
    expect(r.base).toBe(W.groupWinner * 12);
    expect(r.bonus).toBe(W.groupSweepBonus);
    expect(r.total).toBe(W.groupWinner * 12 + W.groupSweepBonus);
  });

  it("no sweep bonus until all 12 groups are decided", () => {
    const codes = ["BRA", "ARG"];
    const predictions: Predictions = { ...blankPrediction, groupWinners: groups(codes) };
    const results: Results = { ...EMPTY_RESULTS, groupWinners: groups(codes) }; // only 2 decided
    const r = scorePredictions(predictions, results, DEFAULT_SETTINGS);
    expect(r.bonus).toBe(0);
    expect(r.base).toBe(W.groupWinner * 2);
  });
});

describe("scorePredictions — Final Four + champion", () => {
  it("awards each correct semifinalist", () => {
    const predictions: Predictions = {
      ...blankPrediction,
      semifinalists: ["BRA", "FRA", "ESP", "ARG"],
    };
    const results: Results = {
      ...EMPTY_RESULTS,
      stageReached: { sf: ["BRA", "FRA", "ENG", "GER"] }, // 2 of 4 correct
    };
    const r = scorePredictions(predictions, results, DEFAULT_SETTINGS);
    expect(r.base).toBe(W.semifinalist * 2);
  });

  it("awards champion when correct", () => {
    const predictions: Predictions = {
      ...blankPrediction,
      semifinalists: ["BRA", "FRA", "ESP", "ARG"],
      champion: "ARG",
    };
    const results: Results = {
      ...EMPTY_RESULTS,
      champion: "ARG",
      stageReached: { sf: ["ARG", "FRA", "ESP", "BRA"] },
    };
    const r = scorePredictions(predictions, results, DEFAULT_SETTINGS);
    // 4 semifinalists correct + champion
    expect(r.base).toBe(W.semifinalist * 4 + W.champion);
  });

  it("does not award a wrong champion", () => {
    const predictions: Predictions = { ...blankPrediction, champion: "BRA" };
    const results: Results = { ...EMPTY_RESULTS, champion: "ARG" };
    expect(scorePredictions(predictions, results, DEFAULT_SETTINGS).base).toBe(0);
  });
});

describe("rankParticipants — ties", () => {
  it("ranks by total then breaks ties on final-goals closeness", () => {
    const ranked = rankParticipants(
      [
        { participantId: "a", name: "Ana", total: 50, finalTotalGoals: 3 },
        { participantId: "b", name: "Beto", total: 50, finalTotalGoals: 5 },
        { participantId: "c", name: "Caro", total: 30, finalTotalGoals: 2 },
      ],
      3, // actual final had 3 goals → Ana is exact
    );
    const byId = Object.fromEntries(ranked.map((r) => [r.participantId, r.rank]));
    // a and b both total 50 → both rank 1 (competition ranking on total)
    expect(byId.a).toBe(1);
    expect(byId.b).toBe(1);
    expect(byId.c).toBe(3);
  });
});
