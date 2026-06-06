import { describe, expect, it } from "vitest";
import { parseKnockoutFixtures, roundToKnockout, type RawFixture } from "./parse-fixtures";

function fx(
  id: number,
  round: string,
  home: string,
  away: string,
  opts: { status?: string; homeWin?: boolean; awayWin?: boolean; date?: string } = {},
): RawFixture {
  return {
    fixture: { id, date: opts.date ?? "2026-06-28T18:00:00+00:00", status: { short: opts.status ?? "NS" } },
    league: { round },
    teams: {
      home: { name: home, winner: opts.homeWin ?? null },
      away: { name: away, winner: opts.awayWin ?? null },
    },
  };
}

describe("roundToKnockout", () => {
  it("maps the WC knockout round labels", () => {
    expect(roundToKnockout("Round of 32")).toBe("r32");
    expect(roundToKnockout("Round of 16")).toBe("r16");
    expect(roundToKnockout("Quarter-finals")).toBe("qf");
    expect(roundToKnockout("Semi-finals")).toBe("sf");
    expect(roundToKnockout("Final")).toBe("final");
  });
  it("excludes the 3rd-place playoff and non-knockout rounds", () => {
    expect(roundToKnockout("3rd Place Final")).toBeNull();
    expect(roundToKnockout("Group Stage - 1")).toBeNull();
    expect(roundToKnockout(undefined)).toBeNull();
  });
  it("does not confuse 'Quarter-finals' (contains 'final') with the Final", () => {
    expect(roundToKnockout("Quarter-finals")).toBe("qf");
    expect(roundToKnockout("Semi-finals")).toBe("sf");
  });
});

describe("parseKnockoutFixtures", () => {
  it("returns a matchup with NO winner for a not-started match", () => {
    const out = parseKnockoutFixtures([fx(1, "Round of 32", "Argentina", "Mexico", { status: "NS" })]);
    expect(out.matches).toHaveLength(1);
    expect(out.matches[0]).toMatchObject({ matchId: "af-1", round: "r32", homeCode: "ARG", awayCode: "MEX" });
    expect(out.matchWinners).toEqual({});
  });

  it("records the winner of a finished match (full time)", () => {
    const out = parseKnockoutFixtures([fx(2, "Round of 16", "Brazil", "USA", { status: "FT", homeWin: true })]);
    expect(out.matchWinners).toEqual({ "af-2": "BRA" });
  });

  it("handles extra time (AET) and penalties (PEN) — records the advancing team", () => {
    const out = parseKnockoutFixtures([
      fx(3, "Quarter-finals", "Spain", "France", { status: "AET", awayWin: true }),
      fx(4, "Semi-finals", "England", "Portugal", { status: "PEN", homeWin: true }),
    ]);
    expect(out.matchWinners).toEqual({ "af-3": "FRA", "af-4": "ENG" });
  });

  it("does NOT record a winner when the match is finished but no side is flagged", () => {
    // Defensive: a 'finished' status with no winner flag (data glitch) scores nothing.
    const out = parseKnockoutFixtures([fx(5, "Round of 16", "Croatia", "Japan", { status: "FT" })]);
    expect(out.matchWinners).toEqual({});
    expect(out.matches).toHaveLength(1); // matchup still present
  });

  it("treats postponed / live matches as no result yet", () => {
    const out = parseKnockoutFixtures([
      fx(6, "Round of 16", "Germany", "Belgium", { status: "PST" }), // postponed
      fx(7, "Round of 16", "Netherlands", "Uruguay", { status: "1H", homeWin: true }), // in play
    ]);
    expect(out.matchWinners).toEqual({});
    expect(out.matches).toHaveLength(2);
  });

  it("excludes the 3rd-place game entirely", () => {
    const out = parseKnockoutFixtures([fx(8, "3rd Place Final", "Brazil", "Spain", { status: "FT", homeWin: true })]);
    expect(out.matches).toHaveLength(0);
    expect(out.matchWinners).toEqual({});
  });

  it("sets champion + stageReached from the Final", () => {
    const out = parseKnockoutFixtures([fx(9, "Final", "Argentina", "France", { status: "PEN", homeWin: true })]);
    expect(out.champion).toBe("ARG");
    expect(out.matchWinners).toEqual({ "af-9": "ARG" });
    expect(out.stageReached.final).toEqual(["ARG", "FRA"]);
    expect(out.stageReached.champion).toEqual(["ARG"]);
  });

  it("r32 contributes matches but NOT a bracket stage (r32 isn't a bracket stage)", () => {
    const out = parseKnockoutFixtures([fx(10, "Round of 32", "Ecuador", "Senegal", { status: "FT", homeWin: true })]);
    expect(out.matches).toHaveLength(1);
    expect(out.stageReached).toEqual({}); // no r32 stage
    expect(out.matchWinners).toEqual({ "af-10": "ECU" });
  });

  it("skips a fixture whose team name can't be resolved", () => {
    const out = parseKnockoutFixtures([fx(11, "Round of 16", "Argentina", "Atlantis FC", { status: "NS" })]);
    expect(out.matches).toHaveLength(0);
  });

  it("skips fixtures with no id (no stable key)", () => {
    const bad: RawFixture = { league: { round: "Round of 16" }, teams: { home: { name: "Argentina" }, away: { name: "Mexico" } } };
    expect(parseKnockoutFixtures([bad]).matches).toHaveLength(0);
  });
});
