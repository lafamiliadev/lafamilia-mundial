import { describe, expect, it } from "vitest";
import { orientApiScore, scoreMatchKey, utcDay } from "./score-match-link";
import type { ProviderScore } from "./football/provider";

const base: ProviderScore = {
  fixtureId: "1",
  status: "final",
  kickoffIso: "2026-06-11T19:00:00Z",
  homeCode: "MEX",
  awayCode: "RSA",
  homeGoals: 2,
  awayGoals: 0,
};

describe("utcDay", () => {
  it("normalizes offsets to the UTC calendar day", () => {
    expect(utcDay("2026-06-11T19:00:00Z")).toBe("2026-06-11");
    // 9pm EDT on the 12th = 01:00Z on the 13th → both sides must agree on UTC.
    expect(utcDay("2026-06-12T21:00:00-04:00")).toBe("2026-06-13");
  });
  it("returns null for empty/invalid input", () => {
    expect(utcDay(null)).toBeNull();
    expect(utcDay("not-a-date")).toBeNull();
  });
});

describe("scoreMatchKey", () => {
  it("is order-independent on the team codes", () => {
    expect(scoreMatchKey("MEX", "RSA", "2026-06-11T19:00:00Z")).toBe(
      scoreMatchKey("RSA", "MEX", "2026-06-11T19:00:00Z"),
    );
  });
  it("disambiguates a rematch by day", () => {
    const a = scoreMatchKey("MEX", "RSA", "2026-06-11T19:00:00Z");
    const b = scoreMatchKey("MEX", "RSA", "2026-06-18T19:00:00Z");
    expect(a).not.toBe(b);
  });
  it("matches across home/away order + timezone when the UTC day agrees", () => {
    // Seed stored in Z, provider in an offset zone — same UTC day → same key.
    expect(scoreMatchKey("MEX", "RSA", "2026-06-13T01:00:00Z")).toBe(
      scoreMatchKey("RSA", "MEX", "2026-06-12T21:00:00-04:00"),
    );
  });
  it("returns null without a valid date", () => {
    expect(scoreMatchKey("MEX", "RSA", null)).toBeNull();
  });
});

describe("orientApiScore", () => {
  it("keeps order when api home == team_a", () => {
    expect(orientApiScore({ teamA: "Mexico", teamB: "South Africa" }, base)).toEqual({ a: 2, b: 0 });
  });

  it("swaps when the provider lists the teams the other way", () => {
    const swapped: ProviderScore = { ...base, homeCode: "RSA", awayCode: "MEX", homeGoals: 0, awayGoals: 2 };
    // team_a is still Mexico → Mexico's 2 must land on side A regardless of home/away.
    expect(orientApiScore({ teamA: "Mexico", teamB: "South Africa" }, swapped)).toEqual({ a: 2, b: 0 });
  });

  it("returns null for a non-final match (never score a live game)", () => {
    expect(orientApiScore({ teamA: "Mexico", teamB: "South Africa" }, { ...base, status: "live" })).toBeNull();
  });

  it("returns null when goals are missing", () => {
    expect(orientApiScore({ teamA: "Mexico", teamB: "South Africa" }, { ...base, homeGoals: null })).toBeNull();
  });

  it("returns null when the teams don't match the fixture (no wrong scoring)", () => {
    expect(orientApiScore({ teamA: "Brazil", teamB: "Morocco" }, base)).toBeNull();
  });

  it("returns null when a team name can't be resolved", () => {
    expect(orientApiScore({ teamA: "Atlantis FC", teamB: "South Africa" }, base)).toBeNull();
  });
});
