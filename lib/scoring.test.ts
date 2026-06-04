import { describe, expect, it } from "vitest";
import { rankParticipants, scorePredictions } from "./scoring";
import { DEFAULT_SETTINGS, EMPTY_RESULTS } from "./types";
import type { LivePick, Predictions, Results } from "./types";

const blankPrediction: Predictions = {
  groupWinners: null,
  semifinalists: null,
  champion: null,
  finalTotalGoals: null,
  bonus: null,
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
    expect(r.bracket).toBe(W.groupWinner); // only group A
  });

  it("adds a clean-sweep bonus when all 12 are decided and correct", () => {
    const codes = ["BRA", "ARG", "FRA", "ESP", "ENG", "POR", "NED", "GER", "MEX", "USA", "JPN", "MAR"];
    const predictions: Predictions = { ...blankPrediction, groupWinners: groups(codes) };
    const results: Results = { ...EMPTY_RESULTS, groupWinners: groups(codes) };
    const r = scorePredictions(predictions, results, DEFAULT_SETTINGS);
    // The clean-sweep bonus is part of the bracket competition (not a Bonus Pick).
    expect(r.bracket).toBe(W.groupWinner * 12 + W.groupSweepBonus);
    expect(r.bonus).toBe(0);
    expect(r.total).toBe(W.groupWinner * 12 + W.groupSweepBonus);
  });

  it("no sweep bonus until all 12 groups are decided", () => {
    const codes = ["BRA", "ARG"];
    const predictions: Predictions = { ...blankPrediction, groupWinners: groups(codes) };
    const results: Results = { ...EMPTY_RESULTS, groupWinners: groups(codes) }; // only 2 decided
    const r = scorePredictions(predictions, results, DEFAULT_SETTINGS);
    expect(r.bracket).toBe(W.groupWinner * 2);
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
    expect(r.bracket).toBe(W.semifinalist * 2);
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
    expect(r.bracket).toBe(W.semifinalist * 4 + W.champion);
  });

  it("does not award a wrong champion", () => {
    const predictions: Predictions = { ...blankPrediction, champion: "BRA" };
    const results: Results = { ...EMPTY_RESULTS, champion: "ARG" };
    expect(scorePredictions(predictions, results, DEFAULT_SETTINGS).bracket).toBe(0);
  });
});

describe("scorePredictions — Bonus Picks", () => {
  it("awards Golden Ball / Boot / Glove on exact match only", () => {
    const predictions: Predictions = {
      ...blankPrediction,
      bonus: { goldenBall: "messi", goldenBoot: "mbappe", goldenGlove: "e-martinez", darkHorse: null },
    };
    const results: Results = {
      ...EMPTY_RESULTS,
      goldenBall: "messi", // hit
      goldenBoot: "haaland", // miss
      goldenGlove: "e-martinez", // hit
    };
    const r = scorePredictions(predictions, results, DEFAULT_SETTINGS);
    expect(r.bonus).toBe(W.goldenBall + W.goldenGlove);
  });

  it("scores Dark Horse by furthest stage reached (not additive)", () => {
    const predictions: Predictions = {
      ...blankPrediction,
      bonus: { goldenBall: null, goldenBoot: null, goldenGlove: null, darkHorse: "MEX" },
    };
    // Reached R16, QF and SF — should award the SF value only.
    const results: Results = {
      ...EMPTY_RESULTS,
      stageReached: { r16: ["MEX"], qf: ["MEX"], sf: ["MEX"] },
    };
    const r = scorePredictions(predictions, results, DEFAULT_SETTINGS);
    expect(r.bonus).toBe(W.darkHorseSf);
  });

  it("awards the R16 Dark Horse value when that's as far as it got", () => {
    const predictions: Predictions = {
      ...blankPrediction,
      bonus: { goldenBall: null, goldenBoot: null, goldenGlove: null, darkHorse: "MEX" },
    };
    const results: Results = { ...EMPTY_RESULTS, stageReached: { r16: ["MEX"] } };
    expect(scorePredictions(predictions, results, DEFAULT_SETTINGS).bonus).toBe(W.darkHorseR16);
  });
});

describe("scorePredictions — Live Knockout Picks", () => {
  const results: Results = {
    ...EMPTY_RESULTS,
    matchWinners: { "m1": "BRA", "m2": "FRA" },
  };

  it("awards round points for a correct winner", () => {
    const picks: LivePick[] = [{ matchId: "m1", round: "r16", team: "BRA", highConviction: false }];
    const r = scorePredictions(blankPrediction, results, DEFAULT_SETTINGS, picks);
    expect(r.live).toBe(W.liveR16);
  });

  it("doubles points on a High Conviction pick", () => {
    const picks: LivePick[] = [{ matchId: "m2", round: "qf", team: "FRA", highConviction: true }];
    const r = scorePredictions(blankPrediction, results, DEFAULT_SETTINGS, picks);
    expect(r.live).toBe(W.liveQf * 2);
  });

  it("awards nothing for a wrong live pick", () => {
    const picks: LivePick[] = [{ matchId: "m1", round: "r16", team: "ARG", highConviction: false }];
    expect(scorePredictions(blankPrediction, results, DEFAULT_SETTINGS, picks).live).toBe(0);
  });

  it("keeps the three slices and total independent", () => {
    const predictions: Predictions = {
      ...blankPrediction,
      groupWinners: groups(["BRA"]),
      bonus: { goldenBall: "messi", goldenBoot: null, goldenGlove: null, darkHorse: null },
    };
    const merged: Results = {
      ...EMPTY_RESULTS,
      groupWinners: { A: "BRA" },
      goldenBall: "messi",
      matchWinners: { "m1": "BRA" },
    };
    const picks: LivePick[] = [{ matchId: "m1", round: "final", team: "BRA", highConviction: false }];
    const r = scorePredictions(predictions, merged, DEFAULT_SETTINGS, picks);
    expect(r.bracket).toBe(W.groupWinner);
    expect(r.bonus).toBe(W.goldenBall);
    expect(r.live).toBe(W.liveFinal);
    expect(r.total).toBe(W.groupWinner + W.goldenBall + W.liveFinal);
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
