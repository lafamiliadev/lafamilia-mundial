import { describe, expect, it } from "vitest";
import { deriveNextRoundMatchups, marqueeScoreMatches } from "./bracket-derive";
import { LIVE_ROUNDS } from "./schedule";
import type { LiveMatch } from "./types";

const sf = (n: 1 | 2, over: Partial<LiveMatch> = {}): LiveMatch => ({
  matchId: `sf-${n}`,
  round: "sf",
  homeCode: n === 1 ? "FRA" : "ENG",
  awayCode: n === 1 ? "ESP" : "ARG",
  kickoffIso: n === 1 ? "2026-07-14T19:00:00+00:00" : "2026-07-15T19:00:00+00:00",
  ...over,
});

const BOTH_SEMIS_DECIDED = { "sf-1": "ESP", "sf-2": "ARG" };

const lockOf = (round: string) => LIVE_ROUNDS.find((r) => r.round === round)!.locksIso;

describe("deriveNextRoundMatchups", () => {
  it("draws the final (winners) AND the 3rd-place game (losers) from two decided semis", () => {
    const derived = deriveNextRoundMatchups([sf(1), sf(2)], BOTH_SEMIS_DECIDED);
    expect(derived).toEqual([
      {
        matchId: "derived-final-1",
        round: "final",
        homeCode: "ESP",
        awayCode: "ARG",
        kickoffIso: lockOf("final"),
      },
      {
        matchId: "derived-third-1",
        round: "third",
        homeCode: "FRA",
        awayCode: "ENG",
        kickoffIso: lockOf("third"),
      },
    ]);
  });

  it("never re-draws a round that already has a matchup (provider/admin wins)", () => {
    const existingFinal: LiveMatch = {
      matchId: "final-1",
      round: "final",
      homeCode: "ESP",
      awayCode: "ARG",
      kickoffIso: "2026-07-19T19:00:00+00:00",
    };
    const existingThird: LiveMatch = {
      matchId: "third-1",
      round: "third",
      homeCode: "FRA",
      awayCode: "ENG",
      kickoffIso: "2026-07-18T21:00:00+00:00",
    };
    expect(
      deriveNextRoundMatchups([sf(1), sf(2), existingFinal, existingThird], BOTH_SEMIS_DECIDED),
    ).toEqual([]);
  });

  it("waits for EVERY match of the round to be decided", () => {
    expect(deriveNextRoundMatchups([sf(1), sf(2)], { "sf-1": "ESP" })).toEqual([]);
  });

  it("won't guess pairings from an incomplete round (odd match count)", () => {
    expect(deriveNextRoundMatchups([sf(1)], { "sf-1": "ESP" })).toEqual([]);
  });

  it("pairs a four-match round into two matchups in kickoff order", () => {
    const qf = (n: number, home: string, away: string): LiveMatch => ({
      matchId: `qf-${n}`,
      round: "qf",
      homeCode: home,
      awayCode: away,
      kickoffIso: `2026-07-${9 + (n % 2)}T${n < 3 ? "19" : "23"}:00:00+00:00`,
    });
    // Sorted by kickoff: qf-1, qf-3 (Jul 9), qf-2, qf-4 (Jul 10) —
    // pairs (qf-1, qf-3) and (qf-2, qf-4).
    const matches = [qf(1, "FRA", "GER"), qf(2, "ENG", "POR"), qf(3, "ESP", "BEL"), qf(4, "ARG", "SUI")];
    const winners = { "qf-1": "FRA", "qf-2": "ENG", "qf-3": "ESP", "qf-4": "ARG" };
    const derived = deriveNextRoundMatchups(matches, winners);
    expect(derived.map((m) => [m.matchId, m.homeCode, m.awayCode])).toEqual([
      ["derived-sf-1", "FRA", "ESP"],
      ["derived-sf-2", "ENG", "ARG"],
    ]);
    expect(derived.every((m) => m.round === "sf")).toBe(true);
  });
});

describe("marqueeScoreMatches", () => {
  const finalMatch: LiveMatch = {
    matchId: "final-1",
    round: "final",
    homeCode: "ESP",
    awayCode: "ARG",
    kickoffIso: "2026-07-19T19:00:00+00:00",
  };
  const thirdMatch: LiveMatch = {
    matchId: "derived-third-1",
    round: "third",
    homeCode: "FRA",
    awayCode: "ENG",
    kickoffIso: "2026-07-18T21:00:00+00:00",
  };

  it("creates a score match for an eligible closing game, skipping ineligible ones", () => {
    // FRA v ENG has no LatAm side and no Spain — score picks stay closed for it.
    const out = marqueeScoreMatches([thirdMatch, finalMatch], []);
    expect(out.map((m) => m.matchId)).toEqual(["ESP_ARG_2026_07_19"]);
    const [final] = out;
    expect([final.teamA, final.teamB]).toEqual(["Spain", "Argentina"]);
    expect(final.eligibleTeam).toBe("Spain, Argentina");
    expect(final.providerFixtureId).toBeNull();
  });

  it("creates an eligible 3rd-place score match (LatAm side playing)", () => {
    const out = marqueeScoreMatches(
      [{ ...thirdMatch, homeCode: "BRA", awayCode: "ENG" }],
      [],
    );
    expect(out.map((m) => m.matchId)).toEqual(["BRA_ENG_2026_07_18"]);
    expect(out[0].eligibleTeam).toBe("Brazil");
  });

  it("skips matches already tracked (idempotent across recomputes)", () => {
    const out = marqueeScoreMatches([thirdMatch, finalMatch], [{ matchId: "ESP_ARG_2026_07_19" }]);
    expect(out).toEqual([]);
  });

  it("holds a score match until the matchup has a kickoff", () => {
    const out = marqueeScoreMatches([{ ...finalMatch, kickoffIso: null }], []);
    expect(out).toEqual([]);
  });
});
