import { describe, expect, it } from "vitest";
import { pointsReason, scoreLabel, summarizeEveryone, type PredInput } from "./score-view";

const pred = (over: Partial<PredInput>): PredInput => ({
  participantId: "id",
  name: "Ana",
  slug: "ana",
  rootingCountry: "MEX",
  scoreA: 1,
  scoreB: 0,
  pointsAwarded: null,
  ...over,
});

describe("summarizeEveryone", () => {
  it("empty set → zeroed, no crash", () => {
    const s = summarizeEveryone([], null);
    expect(s).toEqual({ total: 0, popular: [], exactWinners: [], rows: [] });
  });

  it("handles a not-yet-final match (no exact/correct flags)", () => {
    const s = summarizeEveryone([pred({ name: "Ana", scoreA: 2, scoreB: 0 }), pred({ name: "Bea", scoreA: 2, scoreB: 0 })], null);
    expect(s.total).toBe(2);
    expect(s.popular[0]).toMatchObject({ scoreA: 2, scoreB: 0, count: 2, isExact: false });
    expect(s.exactWinners).toEqual([]);
    expect(s.rows.every((r) => r.points === null && !r.isExact && !r.correct)).toBe(true);
  });

  it("ranks popular scores by count and marks the exact line once final", () => {
    const preds = [
      pred({ name: "A", scoreA: 2, scoreB: 0, pointsAwarded: 3 }),
      pred({ name: "B", scoreA: 2, scoreB: 0, pointsAwarded: 3 }),
      pred({ name: "C", scoreA: 1, scoreB: 1, pointsAwarded: 0 }),
    ];
    const s = summarizeEveryone(preds, { a: 2, b: 0 });
    expect(s.popular[0]).toMatchObject({ scoreA: 2, scoreB: 0, count: 2, isExact: true });
    expect(s.popular[1]).toMatchObject({ scoreA: 1, scoreB: 1, count: 1, isExact: false });
    expect(s.exactWinners.map((w) => w.name)).toEqual(["A", "B"]);
  });

  it("sorts rows winners-first (exact → correct → rest), alphabetical within", () => {
    const preds = [
      pred({ name: "Zoe", scoreA: 0, scoreB: 0, pointsAwarded: 0 }), // wrong
      pred({ name: "Mia", scoreA: 3, scoreB: 1, pointsAwarded: 1 }), // correct result
      pred({ name: "Ada", scoreA: 2, scoreB: 0, pointsAwarded: 3 }), // exact
    ];
    const s = summarizeEveryone(preds, { a: 2, b: 0 });
    expect(s.rows.map((r) => r.name)).toEqual(["Ada", "Mia", "Zoe"]);
    expect(s.rows[0]).toMatchObject({ isExact: true, correct: true });
    expect(s.rows[2]).toMatchObject({ isExact: false, correct: false });
  });

  it("defends against blank names", () => {
    const s = summarizeEveryone([pred({ name: "  " }), pred({ name: null as unknown as string })], null);
    expect(s.rows.every((r) => r.name === "Anónimo")).toBe(true);
  });
});

describe("pointsReason / scoreLabel", () => {
  it("explains points", () => {
    expect(pointsReason(3)).toBe("Exact score");
    expect(pointsReason(1)).toBe("Correct result");
    expect(pointsReason(0)).toBe("Didn't match");
    expect(pointsReason(null)).toBe("Not scored yet");
  });
  it("labels a score", () => {
    expect(scoreLabel(2, 1)).toBe("2–1");
  });
});
