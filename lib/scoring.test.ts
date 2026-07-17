import { describe, expect, it } from "vitest";
import { rankParticipants, scoreMatchPrediction, scorePredictions } from "./scoring";
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

  it("no bonus for all 12 correct — just the per-group points", () => {
    const codes = ["BRA", "ARG", "FRA", "ESP", "ENG", "POR", "NED", "GER", "MEX", "USA", "JPN", "MAR"];
    const predictions: Predictions = { ...blankPrediction, groupWinners: groups(codes) };
    const results: Results = { ...EMPTY_RESULTS, groupWinners: groups(codes) };
    const r = scorePredictions(predictions, results, DEFAULT_SETTINGS);
    // Sweeping all 12 pays the per-group points only — no extra clean-sweep bonus.
    expect(r.bracket).toBe(W.groupWinner * 12);
    expect(r.bonus).toBe(0);
    expect(r.total).toBe(W.groupWinner * 12);
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

  // ── Accuracy guarantees the whole game depends on ──

  it("awards NOTHING until the result exists (no winner recorded yet)", () => {
    const noResults: Results = { ...EMPTY_RESULTS, matchWinners: {} };
    const picks: LivePick[] = [{ matchId: "m1", round: "r16", team: "BRA", highConviction: true }];
    // Even a correct, high-conviction pick scores 0 while the result is missing.
    expect(scorePredictions(blankPrediction, noResults, DEFAULT_SETTINGS, picks).live).toBe(0);
  });

  it("does NOT double anything on a wrong High Conviction pick", () => {
    const picks: LivePick[] = [{ matchId: "m1", round: "qf", team: "ARG", highConviction: true }];
    expect(scorePredictions(blankPrediction, results, DEFAULT_SETTINGS, picks).live).toBe(0);
  });

  it("doubles at most ONE pick across the Final & 3rd Place section", () => {
    // Belt-and-suspenders: the save path forbids this state, but even if two
    // ⚡ picks reached the engine, only the first in the section may double.
    const closing: Results = {
      ...EMPTY_RESULTS,
      matchWinners: { "derived-third-1": "FRA", "final-1": "ESP" },
    };
    const picks: LivePick[] = [
      { matchId: "derived-third-1", round: "third", team: "FRA", highConviction: true },
      { matchId: "final-1", round: "final", team: "ESP", highConviction: true },
    ];
    const r = scorePredictions(blankPrediction, closing, DEFAULT_SETTINGS, picks);
    expect(r.live).toBe(W.liveThird * 2 + W.liveFinal); // second ⚡ ignored
  });

  it("still allows one ⚡ in an earlier round AND one in the closing section", () => {
    const mixed: Results = {
      ...EMPTY_RESULTS,
      matchWinners: { "m1": "BRA", "final-1": "ESP" },
    };
    const picks: LivePick[] = [
      { matchId: "m1", round: "sf", team: "BRA", highConviction: true },
      { matchId: "final-1", round: "final", team: "ESP", highConviction: true },
    ];
    const r = scorePredictions(blankPrediction, mixed, DEFAULT_SETTINGS, picks);
    expect(r.live).toBe(W.liveSf * 2 + W.liveFinal * 2);
  });

  it("weights each round correctly and accumulates across rounds", () => {
    const r: Results = {
      ...EMPTY_RESULTS,
      matchWinners: { a: "BRA", b: "FRA", c: "ARG", d: "ESP", e: "GER" },
    };
    const picks: LivePick[] = [
      { matchId: "a", round: "r32", team: "BRA", highConviction: false },
      { matchId: "b", round: "r16", team: "FRA", highConviction: false },
      { matchId: "c", round: "qf", team: "ARG", highConviction: false },
      { matchId: "d", round: "sf", team: "ESP", highConviction: false },
      { matchId: "e", round: "final", team: "GER", highConviction: false },
    ];
    const out = scorePredictions(blankPrediction, r, DEFAULT_SETTINGS, picks);
    expect(out.live).toBe(W.liveR32 + W.liveR16 + W.liveQf + W.liveSf + W.liveFinal); // 1+2+4+8+16 = 31
  });

  it("is idempotent — scoring the same inputs twice gives the same result", () => {
    const picks: LivePick[] = [
      { matchId: "m1", round: "r16", team: "BRA", highConviction: true },
      { matchId: "m2", round: "qf", team: "FRA", highConviction: false },
    ];
    const a = scorePredictions(blankPrediction, results, DEFAULT_SETTINGS, picks);
    const b = scorePredictions(blankPrediction, results, DEFAULT_SETTINGS, picks);
    expect(a).toEqual(b);
  });

  it("matches the documented Live Picks maximum (80 base + 31 conviction = 111)", () => {
    // One correct pick in every match of every round, with one ⚡ per round.
    const rounds: { round: LivePick["round"]; n: number }[] = [
      { round: "r32", n: 16 },
      { round: "r16", n: 8 },
      { round: "qf", n: 4 },
      { round: "sf", n: 2 },
      { round: "final", n: 1 },
    ];
    const matchWinners: Record<string, string> = {};
    const picks: LivePick[] = [];
    for (const { round, n } of rounds) {
      for (let i = 0; i < n; i++) {
        const id = `${round}-${i}`;
        matchWinners[id] = "BRA";
        picks.push({ matchId: id, round, team: "BRA", highConviction: i === 0 }); // ⚡ on the first
      }
    }
    const out = scorePredictions(blankPrediction, { ...EMPTY_RESULTS, matchWinners }, DEFAULT_SETTINGS, picks);
    expect(out.live).toBe(111);
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

  it("orders equal totals by the spec chain: champion → live → goals → submission", () => {
    const ranked = rankParticipants(
      [
        // All tied on total; differ only on tie-break inputs.
        { participantId: "late", name: "Z", total: 50, finalTotalGoals: 3, championCorrect: true, liveCorrect: 5, submittedAt: "2026-06-10T00:00:00Z" },
        { participantId: "early", name: "A", total: 50, finalTotalGoals: 3, championCorrect: true, liveCorrect: 5, submittedAt: "2026-06-01T00:00:00Z" },
        { participantId: "fewerlive", name: "M", total: 50, finalTotalGoals: 3, championCorrect: true, liveCorrect: 2, submittedAt: "2026-06-01T00:00:00Z" },
        { participantId: "nochamp", name: "B", total: 50, finalTotalGoals: 3, championCorrect: false, liveCorrect: 9, submittedAt: "2026-05-01T00:00:00Z" },
      ],
      3,
    );
    const order = ranked.map((r) => r.participantId);
    // champion-correct first (3 of them), nochamp last despite most live picks;
    // among champions: more live picks, then earliest submission breaks the dead heat.
    expect(order).toEqual(["early", "late", "fewerlive", "nochamp"]);
  });
});

describe("scorePredictions — engine self-protects against bad input", () => {
  it("never double-counts a duplicated semifinalist", () => {
    const predictions: Predictions = {
      ...blankPrediction,
      semifinalists: ["BRA", "BRA", "FRA", "ESP"],
    };
    const results: Results = { ...EMPTY_RESULTS, stageReached: { sf: ["BRA", "FRA", "GER", "NED"] } };
    expect(scorePredictions(predictions, results, DEFAULT_SETTINGS).bracket).toBe(W.semifinalist * 2);
  });

  it("scores a match only once even if the same matchId appears twice", () => {
    const results: Results = { ...EMPTY_RESULTS, matchWinners: { m1: "BRA" } };
    const picks: LivePick[] = [
      { matchId: "m1", round: "r16", team: "BRA", highConviction: false },
      { matchId: "m1", round: "r16", team: "BRA", highConviction: false },
    ];
    expect(scorePredictions(blankPrediction, results, DEFAULT_SETTINGS, picks).live).toBe(W.liveR16);
  });

  it("doubles at most one High Conviction pick per round", () => {
    const results: Results = { ...EMPTY_RESULTS, matchWinners: { a: "BRA", b: "FRA" } };
    const picks: LivePick[] = [
      { matchId: "a", round: "qf", team: "BRA", highConviction: true },
      { matchId: "b", round: "qf", team: "FRA", highConviction: true },
    ];
    expect(scorePredictions(blankPrediction, results, DEFAULT_SETTINGS, picks).live).toBe(W.liveQf * 2 + W.liveQf);
  });
});

describe("scoreMatchPrediction — bonus score picks", () => {
  it("awards 3 for an exact score", () => {
    expect(scoreMatchPrediction({ scoreA: 2, scoreB: 1 }, { scoreA: 2, scoreB: 1 })).toBe(3);
  });

  it("awards 1 for correct winner (not exact)", () => {
    expect(scoreMatchPrediction({ scoreA: 1, scoreB: 0 }, { scoreA: 2, scoreB: 1 })).toBe(1);
  });

  it("awards 1 for correct draw (not exact)", () => {
    expect(scoreMatchPrediction({ scoreA: 0, scoreB: 0 }, { scoreA: 1, scoreB: 1 })).toBe(1);
  });

  it("awards 3 for exact 0-0 draw", () => {
    expect(scoreMatchPrediction({ scoreA: 0, scoreB: 0 }, { scoreA: 0, scoreB: 0 })).toBe(3);
  });

  it("awards 0 for predicted win but actual draw", () => {
    expect(scoreMatchPrediction({ scoreA: 2, scoreB: 1 }, { scoreA: 1, scoreB: 1 })).toBe(0);
  });

  it("awards 0 for predicted draw but actual win", () => {
    expect(scoreMatchPrediction({ scoreA: 1, scoreB: 1 }, { scoreA: 2, scoreB: 0 })).toBe(0);
  });

  it("awards 0 for predicted wrong team winning", () => {
    expect(scoreMatchPrediction({ scoreA: 0, scoreB: 1 }, { scoreA: 2, scoreB: 1 })).toBe(0);
  });

  it("scorePredictions includes score prediction bonus in the scorePick slice (not bonus)", () => {
    const r = scorePredictions(blankPrediction, EMPTY_RESULTS, DEFAULT_SETTINGS, [], 4);
    expect(r.scorePick).toBe(4);
    expect(r.bonus).toBe(0);
    expect(r.total).toBe(4);
    expect(r.lines.some((l) => l.label === "Score picks" && l.group === "score-pick")).toBe(true);
  });

  it("scorePredictions with zero bonus adds nothing", () => {
    const r = scorePredictions(blankPrediction, EMPTY_RESULTS, DEFAULT_SETTINGS, [], 0);
    expect(r.scorePick).toBe(0);
    expect(r.bonus).toBe(0);
    expect(r.lines.find((l) => l.label === "Score picks")).toBeUndefined();
  });
});

// Every bonus score-prediction point must reach the main leaderboard total.
// `total` is what the Overall board ranks on (services.getLeaderboardData →
// pointsFor → s.total), so these guard that score picks always count there —
// never siloed into a separate ranking.
describe("scorePredictions — bonus score picks count in the main total", () => {
  it("case 1: bracket + Mexico score pick + a new bonus-match point all land in total", () => {
    // Bracket: correct champion. Score picks: Mexico exact (3) + a new match's
    // correct-result point (1) = 4, pre-summed by repo.getScorePredictionTotals.
    const predictions: Predictions = { ...blankPrediction, champion: "BRA" };
    const results: Results = { ...EMPTY_RESULTS, champion: "BRA" };
    const mexicoExact = 3;
    const newMatchResult = 1;
    const r = scorePredictions(predictions, results, DEFAULT_SETTINGS, [], mexicoExact + newMatchResult);

    expect(r.bracket).toBe(W.champion);
    expect(r.scorePick).toBe(4);
    // The headline guarantee: total includes the bonus points, not just bracket.
    expect(r.total).toBe(W.champion + 4);
    // And the breakdown surfaces both, so players see where points came from.
    expect(r.lines.some((l) => l.group === "bracket")).toBe(true);
    expect(r.lines.some((l) => l.label === "Score picks" && l.group === "score-pick")).toBe(true);
  });

  it("case 2: a player with only score-pick points still has a real, rankable total", () => {
    const r = scorePredictions(blankPrediction, EMPTY_RESULTS, DEFAULT_SETTINGS, [], 5);
    expect(r.bracket).toBe(0);
    expect(r.bonus).toBe(0);
    expect(r.live).toBe(0);
    expect(r.scorePick).toBe(5);
    expect(r.total).toBe(5); // > 0, so they appear and rank on the Overall board
  });

  it("case 3: an unscored bonus match contributes 0 — total never breaks (no NaN)", () => {
    // repo.getScorePredictionTotals omits predictions with pointsAwarded == null,
    // so an unscored match simply isn't in the summed bonus. Mirror that here:
    // only the one scored match (3) reaches the engine; the pending match adds 0.
    const predictions: Predictions = { ...blankPrediction, champion: "ARG" };
    const results: Results = { ...EMPTY_RESULTS, champion: "ARG" };
    const onlyScoredMatch = 3; // a second, still-unscored match contributes nothing
    const r = scorePredictions(predictions, results, DEFAULT_SETTINGS, [], onlyScoredMatch);

    expect(Number.isNaN(r.total)).toBe(false);
    expect(r.scorePick).toBe(3);
    expect(r.total).toBe(W.champion + 3);
  });
});
