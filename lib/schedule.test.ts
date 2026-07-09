import { describe, expect, it } from "vitest";
import { pickStatus } from "./schedule";
import type { LiveMatch } from "./types";

const LOCK = "2026-06-11T20:00:00Z";

const qfMatches: LiveMatch[] = [
  { matchId: "af-1", round: "qf", homeCode: "FRA", awayCode: "MAR", kickoffIso: "2026-07-09T20:00:00+00:00" },
  { matchId: "af-2", round: "qf", homeCode: "NOR", awayCode: "ENG", kickoffIso: "2026-07-11T21:00:00+00:00" },
  { matchId: "qf-3", round: "qf", homeCode: "ESP", awayCode: "BEL", kickoffIso: "2026-07-10T19:00:00+00:00" },
  { matchId: "qf-4", round: "qf", homeCode: "ARG", awayCode: "SUI", kickoffIso: "2026-07-12T01:00:00+00:00" },
];

describe("pickStatus (per-game aware)", () => {
  it("is bonus-open before the tournament lock", () => {
    const s = pickStatus(new Date("2026-06-10T00:00:00Z"), LOCK, qfMatches);
    expect(s.state).toBe("bonus-open");
  });

  it("reports the round OPEN before its scheduled window when its games are pickable", () => {
    // 06:30 UTC on QF day — hours before the printed 9am ET open. Games exist
    // and haven't kicked off, so picks are live and the status must say so.
    const s = pickStatus(new Date("2026-07-09T06:30:00Z"), LOCK, qfMatches);
    expect(s).toMatchObject({ state: "round-open", round: { round: "qf" } });
  });

  it("keeps the round OPEN past its printed lock while later games haven't kicked off", () => {
    // After the round's printed noon-ET lock AND after the first kickoff —
    // Saturday's games are still pickable, so the round is still open.
    const s = pickStatus(new Date("2026-07-10T02:00:00Z"), LOCK, qfMatches);
    expect(s).toMatchObject({ state: "round-open", round: { round: "qf" } });
  });

  it("moves to round-soon once every game of the round has kicked off", () => {
    const s = pickStatus(new Date("2026-07-12T02:00:00Z"), LOCK, qfMatches);
    expect(s).toMatchObject({ state: "round-soon", round: { round: "sf" } });
  });

  it("falls back to the scheduled window when matchups aren't drawn yet", () => {
    // No matches supplied: inside the printed r32 window the round reads open.
    const s = pickStatus(new Date("2026-06-28T14:00:00Z"), LOCK, []);
    expect(s).toMatchObject({ state: "round-open", round: { round: "r32" } });
  });

  it("never counts a game with a missing kickoff as open", () => {
    const drawn: LiveMatch[] = [
      { matchId: "sf-1", round: "sf", homeCode: "FRA", awayCode: "ESP", kickoffIso: null },
    ];
    const s = pickStatus(new Date("2026-07-12T02:00:00Z"), LOCK, drawn);
    expect(s).toMatchObject({ state: "round-soon", round: { round: "sf" } });
  });
});
