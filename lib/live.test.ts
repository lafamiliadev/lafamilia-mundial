import { describe, expect, it } from "vitest";
import {
  ROUND_MATCH_COUNT,
  currentLiveRoundView,
  liveMatchOpen,
  matchId,
  matchImpact,
  matchesForRound,
  mergeRoundPicks,
  reconcileLiveMatches,
  roundState,
  sanitizeLivePicks,
} from "./live";
import { LIVE_ROUNDS } from "./schedule";
import { DEFAULT_WEIGHTS, type KnockoutRound, type LiveMatch, type LivePick } from "./types";

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

const NOW = new Date("2026-06-28T17:00:00Z").getTime();
function mk(id: string, round: KnockoutRound, kickoff: string | null): LiveMatch {
  return { matchId: id, round, homeCode: "ARG", awayCode: "MEX", kickoffIso: kickoff };
}

describe("liveMatchOpen (per-game lock)", () => {
  it("is open before kickoff and locked at/after it", () => {
    expect(liveMatchOpen({ kickoffIso: "2026-06-28T19:00:00Z" }, NOW)).toBe(true);
    expect(liveMatchOpen({ kickoffIso: "2026-06-28T16:00:00Z" }, NOW)).toBe(false);
    // exactly at kickoff → locked
    expect(liveMatchOpen({ kickoffIso: "2026-06-28T17:00:00Z" }, NOW)).toBe(false);
  });
  it("treats a missing/invalid kickoff as locked", () => {
    expect(liveMatchOpen({ kickoffIso: null }, NOW)).toBe(false);
    expect(liveMatchOpen({ kickoffIso: "not-a-date" }, NOW)).toBe(false);
  });
});

describe("currentLiveRoundView", () => {
  it("returns null when no matchups are drawn", () => {
    expect(currentLiveRoundView([], NOW)).toBeNull();
  });
  it("shows the earliest round that still has an open game", () => {
    const v = currentLiveRoundView(
      [mk("r32-1", "r32", "2026-06-28T16:00:00Z"), mk("r32-2", "r32", "2026-06-29T19:00:00Z")],
      NOW,
    );
    expect(v?.round).toBe("r32");
    expect(v?.hasOpenGames).toBe(true);
  });
  it("falls back to the latest drawn round (read-only) when none are open", () => {
    const v = currentLiveRoundView([mk("r32-1", "r32", "2026-06-28T16:00:00Z")], NOW);
    expect(v?.round).toBe("r32");
    expect(v?.hasOpenGames).toBe(false);
  });
  it("advances to a later round once its games are open and the earlier round has none", () => {
    const v = currentLiveRoundView(
      [mk("r32-1", "r32", "2026-06-28T16:00:00Z"), mk("r16-1", "r16", "2026-07-04T19:00:00Z")],
      NOW,
    );
    expect(v?.round).toBe("r16");
    expect(v?.hasOpenGames).toBe(true);
  });
});

describe("mergeRoundPicks (partial save)", () => {
  const existing: LivePick[] = [
    { matchId: "r32-1", round: "r32", team: "ARG", highConviction: true },
    { matchId: "r32-2", round: "r32", team: "BRA", highConviction: false },
  ];
  it("replaces submitted games and preserves the rest", () => {
    const res = mergeRoundPicks(existing, [
      { matchId: "r32-2", round: "r32", team: "USA", highConviction: false },
    ]);
    expect(res.ok).toBe(true);
    if (res.ok) {
      const byId = Object.fromEntries(res.picks.map((p) => [p.matchId, p.team]));
      expect(byId["r32-1"]).toBe("ARG"); // preserved (not submitted)
      expect(byId["r32-2"]).toBe("USA"); // replaced
      expect(res.picks).toHaveLength(2);
    }
  });
  it("rejects a second ⚡ Double Down across the merged round", () => {
    const res = mergeRoundPicks(existing, [
      { matchId: "r32-2", round: "r32", team: "USA", highConviction: true },
    ]);
    expect(res.ok).toBe(false); // r32-1 already holds the ⚡
  });
  it("allows moving the ⚡ when the old game is re-submitted without it", () => {
    const res = mergeRoundPicks(existing, [
      { matchId: "r32-1", round: "r32", team: "ARG", highConviction: false },
      { matchId: "r32-2", round: "r32", team: "BRA", highConviction: true },
    ]);
    expect(res.ok).toBe(true);
  });
});

describe("reconcileLiveMatches", () => {
  const fresh = (id: string, home: string, away: string, kick: string): LiveMatch => ({
    matchId: id,
    round: "qf" as KnockoutRound,
    homeCode: home,
    awayCode: away,
    kickoffIso: kick,
  });

  it("replaces the list with provider matches when nothing was stored", () => {
    const f = [fresh("af-1", "FRA", "MAR", "2026-07-09T20:00:00+00:00")];
    const { matches, renames } = reconcileLiveMatches([], f);
    expect(matches).toEqual(f);
    expect(renames).toEqual({});
  });

  it("renames a back-filled matchup to the provider id (either orientation)", () => {
    const stored = [
      { matchId: "qf-3", round: "qf", homeCode: "ESP", awayCode: "BEL", kickoffIso: "2026-07-10T19:00:00+00:00" },
      { matchId: "qf-4", round: "qf", homeCode: "SUI", awayCode: "ARG", kickoffIso: "2026-07-12T01:00:00+00:00" },
    ] as LiveMatch[];
    const f = [
      fresh("af-9001", "ESP", "BEL", "2026-07-10T19:00:00+00:00"),
      fresh("af-9002", "ARG", "SUI", "2026-07-12T01:00:00+00:00"),
    ];
    const { matches, renames } = reconcileLiveMatches(stored, f);
    expect(renames).toEqual({ "qf-3": "af-9001", "qf-4": "af-9002" });
    expect(matches).toEqual(f); // provider entry wins — no duplicate cards
  });

  it("keeps stored matchups the provider doesn't return yet", () => {
    const stored = [
      { matchId: "qf-3", round: "qf", homeCode: "ESP", awayCode: "BEL", kickoffIso: null },
    ] as LiveMatch[];
    const f = [fresh("af-1", "FRA", "MAR", "2026-07-09T20:00:00+00:00")];
    const { matches, renames } = reconcileLiveMatches(stored, f);
    expect(renames).toEqual({});
    expect(matches).toHaveLength(2);
    expect(matches.map((x) => x.matchId).sort()).toEqual(["af-1", "qf-3"]);
  });

  it("does not rename across rounds and reports no rename for identical ids", () => {
    const stored = [
      { matchId: "af-1", round: "r16", homeCode: "FRA", awayCode: "MAR", kickoffIso: null },
      { matchId: "af-2", round: "qf", homeCode: "NOR", awayCode: "ENG", kickoffIso: null },
    ] as LiveMatch[];
    const f = [
      fresh("af-3", "FRA", "MAR", "2026-07-09T20:00:00+00:00"), // qf — the r16 game is a different match
      fresh("af-2", "NOR", "ENG", "2026-07-11T21:00:00+00:00"),
    ];
    const { matches, renames } = reconcileLiveMatches(stored, f);
    expect(renames).toEqual({});
    expect(matches.map((x) => x.matchId).sort()).toEqual(["af-1", "af-2", "af-3"]);
  });
});
