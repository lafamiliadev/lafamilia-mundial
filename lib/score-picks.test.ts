import { describe, expect, it } from "vitest";
import {
  isScorePickOpen,
  lockingSoonMatches,
  nextOpenUnpredicted,
  openScoreMatches,
  ptDateOf,
  scorePickState,
  LOCKING_SOON_MS,
} from "./score-picks";
import type { ScoreMatch } from "./types";

const match = (matchId: string, kickoffUtc: string, teamA = "A", teamB = "B"): ScoreMatch => ({
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

const KICK = "2026-06-20T03:00:00Z";
const k = new Date(KICK).getTime();
const m = match("TUR_PAR", KICK);

describe("scorePickState — open until kickoff, then locked", () => {
  it("is open well before kickoff (even days out)", () => {
    expect(scorePickState(m, k - 5 * 24 * 3600_000)).toBe("open");
  });
  it("is open one second before kickoff", () => {
    expect(scorePickState(m, k - 1000)).toBe("open");
  });
  it("is closed exactly at kickoff", () => {
    expect(scorePickState(m, k)).toBe("closed");
  });
  it("is closed after kickoff", () => {
    expect(scorePickState(m, k + 1000)).toBe("closed");
  });
  it("is closed on an invalid kickoff", () => {
    expect(scorePickState(match("X", "not-a-date"), k)).toBe("closed");
  });
  it("isScorePickOpen mirrors the state", () => {
    expect(isScorePickOpen(m, k - 1000)).toBe(true);
    expect(isScorePickOpen(m, k)).toBe(false);
  });
});

describe("openScoreMatches / nextOpenUnpredicted", () => {
  const a = match("A", "2026-06-20T03:00:00Z", "Türkiye", "Paraguay");
  const b = match("B", "2026-06-21T16:00:00Z", "Spain", "Saudi Arabia");
  const c = match("C", "2026-06-19T01:00:00Z", "USA", "Paraguay"); // earliest
  const all = [a, b, c];

  it("returns every not-yet-kicked-off match, soonest first", () => {
    const now = new Date("2026-06-18T00:00:00Z").getTime();
    expect(openScoreMatches(all, now).map((x) => x.matchId)).toEqual(["C", "A", "B"]);
  });

  it("drops matches that have kicked off", () => {
    const now = new Date("2026-06-20T12:00:00Z").getTime(); // C and A done, B still open
    expect(openScoreMatches(all, now).map((x) => x.matchId)).toEqual(["B"]);
  });

  it("nextOpenUnpredicted skips predicted and hides when all open are done", () => {
    const now = new Date("2026-06-18T00:00:00Z").getTime();
    expect(nextOpenUnpredicted(all, now, new Set())?.matchId).toBe("C");
    expect(nextOpenUnpredicted(all, now, new Set(["C"]))?.matchId).toBe("A");
    expect(nextOpenUnpredicted(all, now, new Set(["A", "B", "C"]))).toBeNull();
  });
});

describe("lockingSoonMatches — daily nudge horizon", () => {
  const soon1 = match("S1", "2026-06-20T05:00:00Z"); // ~5h out
  const soon2 = match("S2", "2026-06-20T20:00:00Z"); // ~20h out
  const far = match("FAR", "2026-06-25T00:00:00Z"); // days out
  const done = match("DONE", "2026-06-19T00:00:00Z"); // already kicked off
  const all = [far, soon2, done, soon1];
  const now = new Date("2026-06-20T00:00:00Z").getTime();

  it("includes only games locking within the horizon, soonest first", () => {
    expect(lockingSoonMatches(all, now).map((x) => x.matchId)).toEqual(["S1", "S2"]);
  });
  it("excludes already-kicked-off games", () => {
    expect(lockingSoonMatches(all, now).some((x) => x.matchId === "DONE")).toBe(false);
  });
  it("excludes games beyond the horizon", () => {
    expect(lockingSoonMatches(all, now).some((x) => x.matchId === "FAR")).toBe(false);
  });
  it("respects a custom horizon", () => {
    expect(lockingSoonMatches(all, now, 6 * 3600_000).map((x) => x.matchId)).toEqual(["S1"]);
    expect(LOCKING_SOON_MS).toBe(30 * 3600_000);
  });
});

describe("ptDateOf", () => {
  it("returns the PT calendar date for a UTC moment", () => {
    // 2026-06-20 02:00 UTC = 2026-06-19 19:00 PT
    expect(ptDateOf(new Date("2026-06-20T02:00:00Z").getTime())).toBe("2026-06-19");
  });
});
