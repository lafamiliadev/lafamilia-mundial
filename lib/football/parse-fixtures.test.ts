import { describe, expect, it } from "vitest";
import {
  fixtureStatus,
  parseFixtureScores,
  parseKnockoutFixtures,
  roundToKnockout,
  type RawFixture,
} from "./parse-fixtures";

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
  it("maps the 3rd-place playoff to its own round; excludes non-knockout rounds", () => {
    expect(roundToKnockout("3rd Place Final")).toBe("third");
    expect(roundToKnockout("Third place play-off")).toBe("third");
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

  it("keeps the 3rd-place game as a pickable matchup without bracket-stage credit", () => {
    const out = parseKnockoutFixtures([fx(8, "3rd Place Final", "Brazil", "Spain", { status: "FT", homeWin: true })]);
    expect(out.matches).toHaveLength(1);
    expect(out.matches[0].round).toBe("third");
    expect(out.matchWinners).toEqual({ "af-8": "BRA" });
    // The consolation game advances no one: no stage credit, no champion.
    expect(out.stageReached).toEqual({});
    expect(out.champion).toBeNull();
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

// A group-stage fixture with goals + status — the bonus-score-prediction input.
function gfx(
  id: number,
  home: string,
  away: string,
  opts: { status?: string; gh?: number | null; ga?: number | null; fth?: number | null; fta?: number | null; date?: string } = {},
): RawFixture {
  const f: RawFixture = {
    fixture: { id, date: opts.date ?? "2026-06-11T19:00:00+00:00", status: { short: opts.status ?? "NS" } },
    league: { round: "Group Stage - 1" },
    teams: { home: { name: home }, away: { name: away } },
    goals: { home: opts.gh ?? null, away: opts.ga ?? null },
  };
  // Only attach a 90-minute (regulation) score when the test provides one.
  if (opts.fth !== undefined || opts.fta !== undefined) {
    f.score = { fulltime: { home: opts.fth ?? null, away: opts.fta ?? null } };
  }
  return f;
}

describe("fixtureStatus — code → lifecycle", () => {
  it("maps finished codes to final", () => {
    for (const s of ["FT", "AET", "PEN"]) expect(fixtureStatus(s)).toBe("final");
  });
  it("maps in-play codes to live", () => {
    for (const s of ["1H", "HT", "2H", "ET", "P", "SUSP"]) expect(fixtureStatus(s)).toBe("live");
  });
  it("maps PST to postponed and CANC/ABD to canceled", () => {
    expect(fixtureStatus("PST")).toBe("postponed");
    expect(fixtureStatus("CANC")).toBe("canceled");
    expect(fixtureStatus("ABD")).toBe("canceled");
  });
  it("falls back to scheduled for NS/TBD/unknown", () => {
    expect(fixtureStatus("NS")).toBe("scheduled");
    expect(fixtureStatus("TBD")).toBe("scheduled");
    expect(fixtureStatus(undefined)).toBe("scheduled");
  });
});

describe("parseFixtureScores — bonus score inputs", () => {
  it("returns a final score with team codes resolved (Mexico vs South Africa)", () => {
    const out = parseFixtureScores([gfx(101, "Mexico", "South Africa", { status: "FT", gh: 2, ga: 0 })]);
    expect(out).toEqual([
      {
        fixtureId: "101",
        status: "final",
        kickoffIso: "2026-06-11T19:00:00+00:00",
        homeCode: "MEX",
        awayCode: "RSA",
        homeGoals: 2,
        awayGoals: 0,
      },
    ]);
  });

  it("never surfaces goals for a non-final match (a live 0-0 is not a result)", () => {
    const [live] = parseFixtureScores([gfx(102, "Mexico", "South Africa", { status: "1H", gh: 0, ga: 0 })]);
    expect(live.status).toBe("live");
    expect(live.homeGoals).toBeNull();
    expect(live.awayGoals).toBeNull();
  });

  it("resolves the awkward names (Congo DR, Curaçao, Türkiye)", () => {
    const out = parseFixtureScores([
      gfx(103, "Colombia", "Congo DR", { status: "FT", gh: 1, ga: 1 }),
      gfx(104, "Ecuador", "Curaçao", { status: "FT", gh: 3, ga: 0 }),
      gfx(105, "Türkiye", "Paraguay", { status: "FT", gh: 0, ga: 2 }),
    ]);
    expect(out.map((s) => [s.homeCode, s.awayCode])).toEqual([
      ["COL", "COD"],
      ["ECU", "CUW"],
      ["TUR", "PAR"],
    ]);
  });

  it("postponed/canceled carry status but no goals", () => {
    const out = parseFixtureScores([
      gfx(106, "Spain", "Cape Verde", { status: "PST" }),
      gfx(107, "Brazil", "Morocco", { status: "CANC" }),
    ]);
    expect(out[0].status).toBe("postponed");
    expect(out[1].status).toBe("canceled");
    expect(out[0].homeGoals).toBeNull();
  });

  it("skips fixtures with no id", () => {
    const bad: RawFixture = { teams: { home: { name: "Mexico" }, away: { name: "South Africa" } } };
    expect(parseFixtureScores([bad])).toHaveLength(0);
  });

  // ── 90-minute (regulation) grading for knockouts ──

  it("grades on the 90-minute result — extra-time goals do NOT count (AET)", () => {
    // 1–1 after 90, decided 2–1 in extra time. goals = 2–1 (incl ET), fulltime = 1–1.
    const [s] = parseFixtureScores([
      gfx(108, "Argentina", "France", { status: "AET", gh: 2, ga: 1, fth: 1, fta: 1 }),
    ]);
    expect([s.homeGoals, s.awayGoals]).toEqual([1, 1]);
  });

  it("a 0–0 regulation decided on penalties scores 0–0, not the shootout (PEN)", () => {
    const [s] = parseFixtureScores([
      gfx(109, "Spain", "Portugal", { status: "PEN", gh: 0, ga: 0, fth: 0, fta: 0 }),
    ]);
    expect([s.homeGoals, s.awayGoals]).toEqual([0, 0]);
  });

  it("falls back to goals when the provider omits score.fulltime (group games unaffected)", () => {
    const [s] = parseFixtureScores([gfx(110, "Mexico", "South Africa", { status: "FT", gh: 2, ga: 0 })]);
    expect([s.homeGoals, s.awayGoals]).toEqual([2, 0]);
  });
});
