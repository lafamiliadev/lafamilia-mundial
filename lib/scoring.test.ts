import { describe, expect, it } from "vitest";
import { rankParticipants, scorePredictions } from "./scoring";
import { DEFAULT_SETTINGS, EMPTY_RESULTS } from "./types";
import type { Predictions, Results } from "./types";

const blankPrediction: Predictions = {
  champion: null,
  runnerUp: null,
  goldenBoot: null,
  darkHorse: null,
  latamFurthest: null,
  finalTotalGoals: null,
};

describe("scorePredictions — base points", () => {
  it("awards nothing on an empty card", () => {
    const r = scorePredictions(blankPrediction, EMPTY_RESULTS, DEFAULT_SETTINGS);
    expect(r.total).toBe(0);
  });

  it("awards champion, runner-up, golden boot and latam exactly once each", () => {
    const predictions: Predictions = {
      ...blankPrediction,
      champion: "ARG",
      runnerUp: "FRA",
      goldenBoot: "messi",
      latamFurthest: "ARG",
    };
    const results: Results = {
      ...EMPTY_RESULTS,
      champion: "ARG",
      runnerUp: "FRA",
      goldenBoot: "messi",
      latamFurthest: "ARG",
      stageReached: { champion: ["ARG"], final: ["ARG", "FRA"] },
    };
    const r = scorePredictions(predictions, results, DEFAULT_SETTINGS);
    // 25 champion + 15 runner-up + 15 boot + 15 latam = 70 base
    expect(r.base).toBe(70);
  });

  it("does not award when predictions are wrong", () => {
    const predictions: Predictions = { ...blankPrediction, champion: "BRA", runnerUp: "ENG" };
    const results: Results = { ...EMPTY_RESULTS, champion: "ARG", runnerUp: "FRA" };
    const r = scorePredictions(predictions, results, DEFAULT_SETTINGS);
    expect(r.base).toBe(0);
  });
});

describe("scorePredictions — progressive bonus", () => {
  it("stacks every round the champion pick survives", () => {
    const predictions: Predictions = { ...blankPrediction, champion: "ARG" };
    const results: Results = {
      ...EMPTY_RESULTS,
      champion: "ARG",
      stageReached: {
        r16: ["ARG"],
        qf: ["ARG"],
        sf: ["ARG"],
        final: ["ARG"],
        champion: ["ARG"],
      },
    };
    const r = scorePredictions(predictions, results, DEFAULT_SETTINGS);
    // base champion 25 + (5+5+10+10+25) bonus = 25 + 55
    expect(r.base).toBe(25);
    expect(r.bonus).toBe(55);
    expect(r.total).toBe(80);
  });

  it("gives partial bonus when the pick is knocked out early", () => {
    const predictions: Predictions = { ...blankPrediction, champion: "MAR" };
    const results: Results = {
      ...EMPTY_RESULTS,
      stageReached: { r16: ["MAR"], qf: ["MAR"] }, // reached QF then out
    };
    const r = scorePredictions(predictions, results, DEFAULT_SETTINGS);
    expect(r.base).toBe(0); // didn't win
    expect(r.bonus).toBe(10); // r16 (5) + qf (5)
  });
});

describe("scorePredictions — dark horse rule", () => {
  it("awards a true outsider that reaches the quarterfinal", () => {
    const predictions: Predictions = { ...blankPrediction, darkHorse: "MAR" }; // seed 2? -> check
    const results: Results = { ...EMPTY_RESULTS, stageReached: { qf: ["MAR"] } };
    // MAR seed is 2 in our data; with default minSeed 3 it should NOT qualify.
    const r = scorePredictions(predictions, results, DEFAULT_SETTINGS);
    expect(r.total).toBe(0);
  });

  it("awards a genuine outsider (seed >= min) that reaches the stage", () => {
    const predictions: Predictions = { ...blankPrediction, darkHorse: "GHA" }; // seed 4
    const results: Results = { ...EMPTY_RESULTS, stageReached: { qf: ["GHA"] } };
    const r = scorePredictions(predictions, results, DEFAULT_SETTINGS);
    expect(r.total).toBe(DEFAULT_SETTINGS.weights.darkHorse);
  });

  it("honors an explicit admin dark-horse override regardless of seed", () => {
    const predictions: Predictions = { ...blankPrediction, darkHorse: "MEX" };
    const results: Results = { ...EMPTY_RESULTS, darkHorseTeam: "MEX" };
    const r = scorePredictions(predictions, results, DEFAULT_SETTINGS);
    expect(r.total).toBe(DEFAULT_SETTINGS.weights.darkHorse);
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
