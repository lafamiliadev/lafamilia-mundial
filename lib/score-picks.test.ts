import { describe, expect, it } from "vitest";
import {
  dueScoreDayGroups,
  isScorePickOpen,
  nextOpenUnpredicted,
  nextUpcomingScoreMatch,
  openScoreMatches,
  planScoreDayEmails,
  scorePickState,
  windowOpenPtDate,
  windowOpensAtMs,
  SCORE_PICK_WINDOW_MS,
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

describe("scorePickState — 24h window (single match)", () => {
  const solo = [m];
  it("is upcoming before the window opens (25h before kickoff)", () => {
    expect(scorePickState(m, solo, k - 25 * 3600_000)).toBe("upcoming");
  });
  it("is open exactly at 24h before kickoff", () => {
    expect(scorePickState(m, solo, k - SCORE_PICK_WINDOW_MS)).toBe("open");
  });
  it("is open one second after the window opens", () => {
    expect(scorePickState(m, solo, k - SCORE_PICK_WINDOW_MS + 1000)).toBe("open");
  });
  it("is open one second before kickoff", () => {
    expect(scorePickState(m, solo, k - 1000)).toBe("open");
  });
  it("is closed exactly at kickoff", () => {
    expect(scorePickState(m, solo, k)).toBe("closed");
  });
  it("is closed after kickoff", () => {
    expect(scorePickState(m, solo, k + 1000)).toBe("closed");
  });
  it("is upcoming just before the window opens", () => {
    expect(scorePickState(m, solo, k - SCORE_PICK_WINDOW_MS - 1000)).toBe("upcoming");
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

  it("at noon Jun 12, only USA_PAR is open (BRA_MAR is a different day, not started)", () => {
    const now = new Date("2026-06-12T12:00:00Z").getTime();
    expect(openScoreMatches(all, now).map((x) => x.matchId)).toEqual(["USA_PAR"]);
    expect(isScorePickOpen(braMar, all, now)).toBe(false);
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

describe("same-day games unlock together", () => {
  // Brazil window opens Jun 12 22:00Z (3pm PT); Haiti's own window opens Jun 13
  // 01:00Z (6pm PT). Both are the same PT day, so they unlock TOGETHER when
  // Brazil's window opens — and each still closes at its own kickoff.
  const braMar = match("BRA_MAR", "2026-06-13T22:00:00Z", "Brazil", "Morocco");
  const haiSco = match("HAI_SCO", "2026-06-14T01:00:00Z", "Haiti", "Scotland");
  const all = [braMar, haiSco];

  it("at Brazil's window-open, BOTH are open (Haiti's own 24h window hasn't started)", () => {
    const now = new Date("2026-06-12T22:05:00Z").getTime();
    expect(isScorePickOpen(haiSco, all, now)).toBe(true); // unlocked early with the day
    expect(openScoreMatches(all, now).map((x) => x.matchId)).toEqual(["BRA_MAR", "HAI_SCO"]);
  });

  it("before the day unlocks, neither is open", () => {
    const now = new Date("2026-06-12T20:00:00Z").getTime();
    expect(openScoreMatches(all, now)).toEqual([]);
    expect(nextUpcomingScoreMatch(all, now)?.matchId).toBe("BRA_MAR");
  });

  it("each still closes at its OWN kickoff", () => {
    const now = new Date("2026-06-13T22:30:00Z").getTime(); // Brazil kicked off; Haiti hasn't
    expect(scorePickState(braMar, all, now)).toBe("closed");
    expect(scorePickState(haiSco, all, now)).toBe("open");
  });
});

describe("daily grouping — one email per user per day", () => {
  // USA_PAR window opens Jun 12 01:00Z = Jun 11 6pm PT → PT day Jun 11.
  // BRA_MAR window opens Jun 12 22:00Z = Jun 12 3pm PT → PT day Jun 12.
  // HAI_SCO window opens Jun 13 01:00Z = Jun 12 6pm PT → PT day Jun 12.
  const usaPar = match("USA_PAR", "2026-06-13T01:00:00Z", "USA", "Paraguay");
  const braMar = match("BRA_MAR", "2026-06-13T22:00:00Z", "Brazil", "Morocco");
  const haiSco = match("HAI_SCO", "2026-06-14T01:00:00Z", "Haiti", "Scotland");
  const all = [usaPar, braMar, haiSco];
  const tmpl = (d: string) => `t-${d}`;

  it("groups same-PT-day windows (Brazil + Haiti both open Jun 12 PT)", () => {
    expect(windowOpenPtDate(braMar)).toBe("2026-06-12");
    expect(windowOpenPtDate(haiSco)).toBe("2026-06-12");
    expect(windowOpenPtDate(usaPar)).toBe("2026-06-11");
  });

  it("at Brazil's open, the Jun 12 group is due with BOTH matches; Jun 11 (USA) is NOT (no catch-up)", () => {
    const now = new Date("2026-06-12T22:05:00Z").getTime();
    const due = dueScoreDayGroups(all, now);
    expect(due.map((g) => g.ptDate)).toEqual(["2026-06-12"]);
    expect(due[0].matches.map((m) => m.matchId)).toEqual(["BRA_MAR", "HAI_SCO"]); // kickoff order
  });

  it("QA: a day with one match → one email; two matches → one grouped email (not two)", () => {
    const now = new Date("2026-06-12T22:05:00Z").getTime();
    const due = dueScoreDayGroups(all, now);
    const plan = planScoreDayEmails(due, ["alex"], {}, {}, tmpl);
    expect(plan).toHaveLength(1); // one day-group → one email
    expect(plan[0].recipients[0].remaining.map((m) => m.matchId)).toEqual(["BRA_MAR", "HAI_SCO"]);
  });

  it("QA: predicted one match → email focuses on the remaining one", () => {
    const now = new Date("2026-06-12T22:05:00Z").getTime();
    const due = dueScoreDayGroups(all, now);
    const plan = planScoreDayEmails(due, ["alex"], { BRA_MAR: new Set(["alex"]) }, {}, tmpl);
    expect(plan[0].recipients[0].remaining.map((m) => m.matchId)).toEqual(["HAI_SCO"]);
  });

  it("QA: predicted ALL of the day's matches → no email", () => {
    const now = new Date("2026-06-12T22:05:00Z").getTime();
    const due = dueScoreDayGroups(all, now);
    const plan = planScoreDayEmails(
      due,
      ["alex"],
      { BRA_MAR: new Set(["alex"]), HAI_SCO: new Set(["alex"]) },
      {},
      tmpl,
    );
    expect(plan[0].recipients).toEqual([]);
  });

  it("QA: idempotent — already emailed today → skipped", () => {
    const now = new Date("2026-06-12T22:05:00Z").getTime();
    const due = dueScoreDayGroups(all, now);
    const plan = planScoreDayEmails(due, ["alex"], {}, { "t-2026-06-12": new Set(["alex"]) }, tmpl);
    expect(plan[0].recipients).toEqual([]);
  });

  it("QA: no catch-up — Jun 11 (USA) group is never due once >6h past its open", () => {
    const now = new Date("2026-06-12T22:05:00Z").getTime(); // ~21h after USA window opened
    const due = dueScoreDayGroups(all, now);
    expect(due.some((g) => g.ptDate === "2026-06-11")).toBe(false);
  });
});
