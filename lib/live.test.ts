import { describe, expect, it } from "vitest";
import {
  ROUND_MATCH_COUNT,
  matchId,
  matchImpact,
  matchesForRound,
  roundState,
  sanitizeLivePicks,
} from "./live";
import { LIVE_ROUNDS } from "./schedule";
import { DEFAULT_WEIGHTS, type LiveMatch, type LivePick } from "./types";

const r32 = LIVE_ROUNDS.find((r) => r.round === "r32")!;

function m(id: string, home: string, away: string): LiveMatch {
  return { matchId: id, round: "r32", homeCode: home, awayCode: away, kickoffIso: null };
}

const MATCHES: LiveMatch[] = [
  m("r32-1", "ARG", "MEX"),
  m("r32-2", "BRA", "USA"),
  m("r32-10", "ESP", "JPN"),
];

describe("matchId / counts", () => {
  it("builds stable ids", () => {
    expect(matchId("r32", 0)).toBe("r32-1");
    expect(matchId("final", 0)).toBe("final-1");
  });
  it("has the right match count per round", () => {
    expect(ROUND_MATCH_COUNT).toEqual({ r32: 16, r16: 8, qf: 4, sf: 2, final: 1 });
  });
});

describe("matchesForRound", () => {
  it("filters by round and sorts numerically (r32-2 before r32-10)", () => {
    const out = matchesForRound(MATCHES, "r32");
    expect(out.map((x) => x.matchId)).toEqual(["r32-1", "r32-2", "r32-10"]);
  });
  it("returns empty for a round with no matches", () => {
    expect(matchesForRound(MATCHES, "qf")).toEqual([]);
  });
});

describe("sanitizeLivePicks", () => {
  it("accepts valid picks with one high-conviction", () => {
    const res = sanitizeLivePicks("r32", MATCHES, [
      { matchId: "r32-1", team: "ARG", highConviction: true },
      { matchId: "r32-2", team: "USA" },
    ]);
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.picks).toHaveLength(2);
      expect(res.picks[0]).toMatchObject({ matchId: "r32-1", team: "ARG", highConviction: true, round: "r32" });
      expect(res.picks[1].highConviction).toBe(false);
    }
  });

  it("rejects a team not in the match", () => {
    const res = sanitizeLivePicks("r32", MATCHES, [{ matchId: "r32-1", team: "FRA" }]);
    expect(res).toEqual({ ok: false, error: "Pick one of the two teams in the match." });
  });

  it("rejects an unknown match", () => {
    const res = sanitizeLivePicks("r32", MATCHES, [{ matchId: "r32-99", team: "ARG" }]);
    expect(res.ok).toBe(false);
  });

  it("rejects more than one high-conviction", () => {
    const res = sanitizeLivePicks("r32", MATCHES, [
      { matchId: "r32-1", team: "ARG", highConviction: true },
      { matchId: "r32-2", team: "BRA", highConviction: true },
    ]);
    expect(res).toEqual({ ok: false, error: "Only one ⚡ Double Down per round." });
  });

  it("rejects duplicate picks for one match", () => {
    const res = sanitizeLivePicks("r32", MATCHES, [
      { matchId: "r32-1", team: "ARG" },
      { matchId: "r32-1", team: "MEX" },
    ]);
    expect(res.ok).toBe(false);
  });
});

describe("roundState", () => {
  const opens = new Date(r32.opensIso).getTime();
  const locks = new Date(r32.locksIso).getTime();

  it("is upcoming before open", () => {
    expect(roundState(r32, opens - 1000, {}, MATCHES)).toBe("upcoming");
  });
  it("is open between open and lock", () => {
    expect(roundState(r32, opens + 1000, {}, MATCHES)).toBe("open");
  });
  it("is locked after lock with no results", () => {
    expect(roundState(r32, locks + 1000, {}, MATCHES)).toBe("locked");
  });
  it("is scored once every match has a winner", () => {
    const winners = { "r32-1": "ARG", "r32-2": "USA", "r32-10": "ESP" };
    expect(roundState(r32, locks + 1000, winners, MATCHES)).toBe("scored");
  });
});

describe("matchImpact", () => {
  const match: LiveMatch = {
    matchId: "r16-1",
    round: "r16",
    homeCode: "ARG",
    awayCode: "MEX",
    kickoffIso: null,
  };
  const W = DEFAULT_WEIGHTS; // liveR16 = 2
  const picks: LivePick[] = [
    { matchId: "r16-1", round: "r16", team: "ARG", highConviction: false },
    { matchId: "r16-1", round: "r16", team: "ARG", highConviction: true }, // ⚡ → doubled
    { matchId: "r16-1", round: "r16", team: "MEX", highConviction: false },
    { matchId: "other", round: "r16", team: "ARG", highConviction: false }, // different match
  ];

  it("counts players + points per side, doubling High Conviction", () => {
    const imp = matchImpact(match, picks, W, {});
    expect(imp.home).toEqual({ players: 2, points: W.liveR16 + W.liveR16 * 2, conviction: 1 }); // 2 + 4 = 6
    expect(imp.away).toEqual({ players: 1, points: W.liveR16, conviction: 0 });
    expect(imp.totalPickers).toBe(3);
    expect(imp.scoredWinner).toBeNull();
  });

  it("reports the recorded winner when one is set", () => {
    const imp = matchImpact(match, picks, W, { "r16-1": "ARG" });
    expect(imp.scoredWinner).toBe("ARG");
  });

  it("is all zeros when nobody picked the match", () => {
    const imp = matchImpact(match, [], W, {});
    expect(imp.totalPickers).toBe(0);
    expect(imp.home.points).toBe(0);
    expect(imp.away.points).toBe(0);
  });
});
