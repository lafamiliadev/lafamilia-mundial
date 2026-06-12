import { describe, expect, it } from "vitest";
import {
  isScorePickOpen,
  nextOpenUnpredicted,
  nextUpcomingScoreMatch,
  openScoreMatches,
  scorePickState,
  scoreWindowEmailDue,
  windowOpensAtMs,
  SCORE_PICK_WINDOW_MS,
  SCORE_WINDOW_EMAIL_FRESH_MS,
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

const KICK = "2026-06-13T01:00:00Z"; // USA vs Paraguay kickoff
const k = new Date(KICK).getTime();
const m = match("USA_PAR", KICK);

describe("scorePickState — 24h window", () => {
  it("is upcoming before the window opens (25h before kickoff)", () => {
    expect(scorePickState(m, k - 25 * 3600_000)).toBe("upcoming");
  });
  it("is open exactly at 24h before kickoff", () => {
    expect(scorePickState(m, k - SCORE_PICK_WINDOW_MS)).toBe("open");
  });
  it("is open one second after the window opens", () => {
    expect(scorePickState(m, k - SCORE_PICK_WINDOW_MS + 1000)).toBe("open");
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
  it("is upcoming just before the window opens", () => {
    expect(scorePickState(m, k - SCORE_PICK_WINDOW_MS - 1000)).toBe("upcoming");
  });
});

describe("windowOpensAtMs", () => {
  it("is exactly 24h before kickoff", () => {
    expect(windowOpensAtMs(m)).toBe(k - SCORE_PICK_WINDOW_MS);
  });
});

describe("openScoreMatches / nextUpcoming / nextOpenUnpredicted", () => {
  // USA_PAR kickoff Jun 13 01:00Z; BRA_MAR kickoff Jun 13 22:00Z.
  const usaPar = match("USA_PAR", "2026-06-13T01:00:00Z", "USA", "Paraguay");
  const braMar = match("BRA_MAR", "2026-06-13T22:00:00Z", "Brazil", "Morocco");
  const all = [usaPar, braMar];

  it("at noon Jun 12, only USA_PAR is open (BRA_MAR window not started)", () => {
    const now = new Date("2026-06-12T12:00:00Z").getTime();
    expect(openScoreMatches(all, now).map((x) => x.matchId)).toEqual(["USA_PAR"]);
    expect(isScorePickOpen(braMar, now)).toBe(false);
    // The next not-yet-open match is BRA_MAR.
    expect(nextUpcomingScoreMatch(all, now)?.matchId).toBe("BRA_MAR");
  });

  it("after BRA_MAR's window opens (Jun 12 22:30Z), both are open", () => {
    const now = new Date("2026-06-12T22:30:00Z").getTime();
    expect(openScoreMatches(all, now).map((x) => x.matchId)).toEqual(["USA_PAR", "BRA_MAR"]);
  });

  it("nextOpenUnpredicted skips a predicted match and hides when all open are done", () => {
    const now = new Date("2026-06-12T23:00:00Z").getTime(); // both open
    expect(nextOpenUnpredicted(all, now, new Set())?.matchId).toBe("USA_PAR");
    expect(nextOpenUnpredicted(all, now, new Set(["USA_PAR"]))?.matchId).toBe("BRA_MAR");
    expect(nextOpenUnpredicted(all, now, new Set(["USA_PAR", "BRA_MAR"]))).toBeNull();
  });

  it("at noon Jun 12, predicting USA_PAR leaves NO open pick (BRA_MAR not open yet)", () => {
    const now = new Date("2026-06-12T12:00:00Z").getTime();
    // The reported bug: after USA_PAR, BRA_MAR must NOT show as open.
    expect(nextOpenUnpredicted(all, now, new Set(["USA_PAR"]))).toBeNull();
  });
});

describe("scoreWindowEmailDue — fresh-open only (no catch-up blast)", () => {
  const k = new Date("2026-06-13T01:00:00Z").getTime();
  const m = match("USA_PAR", "2026-06-13T01:00:00Z");
  it("is due right when the window opens", () => {
    expect(scoreWindowEmailDue(m, k - SCORE_PICK_WINDOW_MS + 60_000)).toBe(true);
  });
  it("is due a few hours after opening (within the freshness window)", () => {
    expect(scoreWindowEmailDue(m, k - SCORE_PICK_WINDOW_MS + SCORE_WINDOW_EMAIL_FRESH_MS - 1000)).toBe(true);
  });
  it("is NOT due long after opening (no catch-up blast)", () => {
    expect(scoreWindowEmailDue(m, k - SCORE_PICK_WINDOW_MS + SCORE_WINDOW_EMAIL_FRESH_MS + 1000)).toBe(false);
  });
  it("is NOT due before the window opens or after kickoff", () => {
    expect(scoreWindowEmailDue(m, k - SCORE_PICK_WINDOW_MS - 1000)).toBe(false);
    expect(scoreWindowEmailDue(m, k + 1000)).toBe(false);
  });
});
