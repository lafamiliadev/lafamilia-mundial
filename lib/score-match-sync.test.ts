import { describe, expect, it } from "vitest";
import { buildScoreMatch, isScorePickEligible, selectNewScoreMatches } from "./score-match-sync";
import type { ProviderScore } from "./football";
import type { ScoreMatch } from "./types";

function fixture(p: Partial<ProviderScore> & { fixtureId: string }): ProviderScore {
  return {
    status: "scheduled",
    kickoffIso: "2026-07-01T01:00:00+00:00",
    homeCode: "MEX",
    awayCode: "ECU",
    homeGoals: null,
    awayGoals: null,
    ...p,
  };
}

describe("isScorePickEligible", () => {
  it("includes LatAm sides and Spain, excludes others", () => {
    expect(isScorePickEligible("ARG")).toBe(true);
    expect(isScorePickEligible("BRA")).toBe(true);
    expect(isScorePickEligible("ESP")).toBe(true); // Spain, explicitly eligible
    expect(isScorePickEligible("FRA")).toBe(false);
    expect(isScorePickEligible("JPN")).toBe(false);
    expect(isScorePickEligible(null)).toBe(false);
  });
});

describe("buildScoreMatch", () => {
  it("pre-links the fixture and names both eligible teams", () => {
    const m = buildScoreMatch({
      fixtureId: "9001",
      kickoffIso: "2026-07-01T01:00:00+00:00",
      homeCode: "MEX",
      awayCode: "ECU",
    });
    expect(m.teamA).toBe("Mexico");
    expect(m.teamB).toBe("Ecuador");
    expect(m.eligibleTeam).toBe("Mexico, Ecuador");
    expect(m.providerFixtureId).toBe("9001"); // pre-linked → auto-scores
    expect(m.finalScoreA).toBeNull();
    expect(m.matchId).toContain("MEX_ECU_2026");
  });
});

describe("selectNewScoreMatches", () => {
  const existing: ScoreMatch[] = [
    {
      matchId: "ARG_ALG_2026_06_16",
      teamA: "Argentina",
      teamB: "Algeria",
      eligibleTeam: "Argentina",
      kickoffUtc: "2026-06-16T00:00:00+00:00",
      displayTimeEt: "",
      displayTimePt: "",
      finalScoreA: 3,
      finalScoreB: 1,
      providerFixtureId: "100",
      scoredBy: "api",
      scoredAt: null,
    },
  ];

  it("creates upcoming LatAm/Spain fixtures only, skipping played, foreign, and known ones", () => {
    const fixtures: ProviderScore[] = [
      fixture({ fixtureId: "9001", homeCode: "MEX", awayCode: "ECU" }), // new + eligible → keep
      fixture({ fixtureId: "9002", homeCode: "FRA", awayCode: "SWE" }), // no eligible team → skip
      fixture({ fixtureId: "9003", homeCode: "ESP", awayCode: "JPN", status: "final" }), // played → skip
      fixture({ fixtureId: "100", homeCode: "ARG", awayCode: "ALG" }), // fixture already tracked → skip
    ];
    const created = selectNewScoreMatches(fixtures, existing);
    expect(created).toHaveLength(1);
    expect(created[0].providerFixtureId).toBe("9001");
    expect(created[0].eligibleTeam).toBe("Mexico, Ecuador");
  });

  it("dedupes within a single batch by match id", () => {
    const dup = fixture({ fixtureId: "9001", homeCode: "ARG", awayCode: "CPV" });
    const dup2 = fixture({ fixtureId: "9009", homeCode: "ARG", awayCode: "CPV" });
    const created = selectNewScoreMatches([dup, dup2], []);
    expect(created).toHaveLength(1);
  });
});
