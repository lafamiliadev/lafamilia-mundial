import { resolveTeamCode } from "../teams";
import type { KnockoutRound, LiveMatch, Stage } from "../types";

// Pure parser for API-Football /fixtures responses → the Live Picks knockout
// matchups + winners. Kept side-effect-free and provider-agnostic so it can be
// unit-tested exhaustively against fake fixtures (the real WC2026 knockouts
// don't exist until late June, so tests are the only pre-tournament safety net).

export type RawFixture = {
  fixture?: { id?: number; date?: string; status?: { short?: string } };
  league?: { round?: string };
  teams?: {
    home?: { name?: string; winner?: boolean | null };
    away?: { name?: string; winner?: boolean | null };
  };
};

/** API status codes that mean the match is over and the result is final. */
const FINISHED = new Set(["FT", "AET", "PEN"]);

/** Map an API round label to our knockout round (3rd-place game excluded). */
export function roundToKnockout(round: string | undefined): KnockoutRound | null {
  if (!round) return null;
  const r = round.toLowerCase();
  if (r.includes("3rd") || r.includes("third")) return null; // 3rd-place playoff
  if (r.includes("32") || r.includes("1/16")) return "r32";
  if (r.includes("16") || r.includes("1/8")) return "r16";
  if (r.includes("quarter")) return "qf"; // before "final" — "quarter-finals" contains "final"
  if (r.includes("semi")) return "sf";
  if (r.includes("final")) return "final";
  return null;
}

/** Which knockout rounds also count as bracket stages (r32 has no bracket stage). */
const KO_TO_STAGE: Record<KnockoutRound, Stage | null> = {
  r32: null,
  r16: "r16",
  qf: "qf",
  sf: "sf",
  final: "final",
};

export type ParsedFixtures = {
  /** Every knockout matchup, with a stable id (`af-<fixtureId>`). */
  matches: LiveMatch[];
  /** matchId → winning team code, ONLY for finished matches with a clear winner. */
  matchWinners: Record<string, string>;
  /** Teams that reached each bracket stage (feeds the original bracket scoring). */
  stageReached: Partial<Record<Stage, string[]>>;
  /** The champion (winner of the Final), once it's played. */
  champion: string | null;
};

export function parseKnockoutFixtures(fixtures: RawFixture[]): ParsedFixtures {
  const matches: LiveMatch[] = [];
  const matchWinners: Record<string, string> = {};
  const stageReached: Partial<Record<Stage, string[]>> = {};
  let champion: string | null = null;

  const addStage = (stage: Stage, code: string | null) => {
    if (!code) return;
    stageReached[stage] = stageReached[stage] ?? [];
    if (!stageReached[stage]!.includes(code)) stageReached[stage]!.push(code);
  };

  for (const fx of fixtures) {
    const round = roundToKnockout(fx.league?.round);
    if (!round) continue;
    const id = fx.fixture?.id;
    if (id == null) continue;

    const homeCode = resolveTeamCode(fx.teams?.home?.name);
    const awayCode = resolveTeamCode(fx.teams?.away?.name);
    // A matchup we can't fully resolve is unusable — skip rather than show a blank.
    if (!homeCode || !awayCode) continue;

    const matchId = `af-${id}`;
    matches.push({
      matchId,
      round,
      homeCode,
      awayCode,
      kickoffIso: fx.fixture?.date ?? null,
    });

    const stage = KO_TO_STAGE[round];
    if (stage) {
      addStage(stage, homeCode);
      addStage(stage, awayCode);
    }

    // Only record a winner when the match is FINAL and a side is flagged the
    // winner — so penalties/extra-time resolve correctly and nothing scores early.
    if (FINISHED.has(fx.fixture?.status?.short ?? "")) {
      const winner =
        fx.teams?.home?.winner === true
          ? homeCode
          : fx.teams?.away?.winner === true
            ? awayCode
            : null;
      if (winner) {
        matchWinners[matchId] = winner;
        if (round === "final") {
          champion = winner;
          addStage("champion", winner);
        }
      }
    }
  }

  return { matches, matchWinners, stageReached, champion };
}
