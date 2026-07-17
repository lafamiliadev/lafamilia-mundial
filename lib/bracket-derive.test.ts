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

describe("deriveNextRoundMatchups", () => {
  it("draws the final from two decided semis, kicking off at the round's scheduled lock", () => {
    const derived = deriveNextRoundMatchups([sf(1), sf(2)], BOTH_SEMIS_DECIDED);
    expect(derived).toEqual([
      {
        matchId: "derived-final-1",
        round: "final",
        homeCode: "ESP",
        awayCode: "ARG",
        kickoffIso: LIVE_ROUNDS.find((r) => r.round === "final")!.locksIso,
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
    expect(
      deriveNextRoundMatchups([sf(1), sf(2), existingFinal], BOTH_SEMIS_DECIDED),
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
    // Kickoff order: qf-1 (Jul 9 19h), qf-2 (Jul 10 19h) → sf 1; qf-3 (Jul 9 23h)…
    // sorted: qf-1, qf-3 (Jul 9), qf-2, qf-4 (Jul 10) — pairs (qf-1, qf-3), (qf-2, qf-4).
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
  const THIRD_PLACE = "2026-07-18T21:00:00Z";

  it("creates the Final and 3rd-place score matches from the bracket", () => {
    const out = marqueeScoreMatches(
      [sf(1), sf(2), finalMatch],
      BOTH_SEMIS_DECIDED,
      [],
      THIRD_PLACE,
    );
    expect(out.map((m) => m.matchId)).toEqual(["ESP_ARG_2026_07_19", "FRA_ENG_2026_07_18"]);
    const [final, third] = out;
    expect([final.teamA, final.teamB]).toEqual(["Spain", "Argentina"]);
    expect(final.eligibleTeam).toBe("Spain, Argentina");
    expect(final.providerFixtureId).toBeNull();
    // 3rd place = the semifinal LOSERS, everyone plays it (no eligible team).
    expect([third.teamA, third.teamB]).toEqual(["France", "England"]);
    expect(third.eligibleTeam).toBe("");
    expect(third.kickoffUtc).toBe(THIRD_PLACE);
  });

  it("skips matches already tracked (idempotent across recomputes)", () => {
    const out = marqueeScoreMatches(
      [sf(1), sf(2), finalMatch],
      BOTH_SEMIS_DECIDED,
      [{ matchId: "ESP_ARG_2026_07_19" }, { matchId: "FRA_ENG_2026_07_18" }],
      THIRD_PLACE,
    );
    expect(out).toEqual([]);
  });

  it("holds the 3rd-place game until both semis are decided", () => {
    const out = marqueeScoreMatches([sf(1), sf(2), finalMatch], { "sf-1": "ESP" }, [], THIRD_PLACE);
    expect(out.map((m) => m.matchId)).toEqual(["ESP_ARG_2026_07_19"]);
  });

  it("holds the Final score match until the matchup has a kickoff", () => {
    const out = marqueeScoreMatches(
      [sf(1), sf(2), { ...finalMatch, kickoffIso: null }],
      BOTH_SEMIS_DECIDED,
      [],
      THIRD_PLACE,
    );
    expect(out.map((m) => m.matchId)).toEqual(["FRA_ENG_2026_07_18"]);
  });
});
