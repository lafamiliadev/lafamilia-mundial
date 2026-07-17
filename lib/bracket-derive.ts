// Draw the bracket forward from our own recorded results — no provider needed.
//
// Born of WC2026: the football API's knockout feed died after the R16 (plan
// downgrade), and every later matchup + score match had to be entered by hand.
// These pure helpers derive what the bracket already implies:
//
// 1. deriveNextRoundMatchups — once EVERY match of a round has a confirmed
//    winner and the next round hasn't been drawn (by provider or admin), pair
//    the winners into next-round matchups. Pairing follows bracket order,
//    approximated by kickoff order within the round (exact for sf → final,
//    FIFA convention for earlier rounds). The 3rd-place game sits outside the
//    winner chain — it's drawn from the semifinal LOSERS. The admin matchup
//    editor and the provider reconcile (which re-keys by round + teams,
//    carrying picks) always win over a derived entry.
// 2. marqueeScoreMatches — Bonus Score Picks for the closing games (3rd place
//    + Final), created from the drawn matchups under the SAME eligibility rule
//    as every other score match: only when a LatAm side or Spain is playing.
//
// Both are idempotent: they only return what doesn't already exist, so calling
// them on every recompute is safe.

import { LIVE_ROUNDS } from "./schedule";
import { buildScoreMatch, isScorePickEligible } from "./score-match-sync";
import type { KnockoutRound, LiveMatch, ScoreMatch } from "./types";

/** The winner-advancement chain. The 3rd-place game is NOT on it — its teams
 * are the semifinal losers, handled separately below. */
const BRACKET_PATH: readonly KnockoutRound[] = ["r32", "r16", "qf", "sf", "final"];

/** Bracket order within a round, approximated by kickoff (matchId tiebreak). */
function byBracketOrder(a: LiveMatch, b: LiveMatch): number {
  return (
    (a.kickoffIso ?? "").localeCompare(b.kickoffIso ?? "") ||
    a.matchId.localeCompare(b.matchId)
  );
}

/** A round's scheduled lock (= its first kickoff) — the default kickoff for a
 * derived matchup, so the game is pickable immediately and locks on time. */
function roundKickoff(round: KnockoutRound): string | null {
  return LIVE_ROUNDS.find((r) => r.round === round)?.locksIso ?? null;
}

/** The decided matches of a round in bracket order, or null if the round is
 * incomplete (odd count) or any match lacks a confirmed winner. */
function decidedRound(
  matches: LiveMatch[],
  round: KnockoutRound,
  matchWinners: Record<string, string>,
): { match: LiveMatch; winner: string }[] | null {
  const roundMatches = matches.filter((m) => m.round === round).sort(byBracketOrder);
  if (roundMatches.length === 0 || roundMatches.length % 2 !== 0) return null;
  const decided = roundMatches.map((match) => ({ match, winner: matchWinners[match.matchId] }));
  return decided.every((d) => d.winner) ? (decided as { match: LiveMatch; winner: string }[]) : null;
}

/**
 * New matchups the bracket implies: winners pair into the next chain round,
 * and the semifinal losers meet in the 3rd-place game.
 */
export function deriveNextRoundMatchups(
  matches: LiveMatch[],
  matchWinners: Record<string, string>,
): LiveMatch[] {
  const derived: LiveMatch[] = [];

  for (let i = 0; i + 1 < BRACKET_PATH.length; i++) {
    const next = BRACKET_PATH[i + 1];
    if (matches.some((m) => m.round === next)) continue; // already drawn — provider/admin wins
    const decided = decidedRound(matches, BRACKET_PATH[i], matchWinners);
    if (!decided) continue; // waiting on results — deriving now would guess at pairings
    for (let p = 0; p < decided.length; p += 2) {
      derived.push({
        matchId: `derived-${next}-${p / 2 + 1}`,
        round: next,
        homeCode: decided[p].winner,
        awayCode: decided[p + 1].winner,
        kickoffIso: roundKickoff(next),
      });
    }
  }

  // 3rd-place game: the two semifinal losers, once both semis are decided.
  if (!matches.some((m) => m.round === "third")) {
    const semis = decidedRound(matches, "sf", matchWinners);
    if (semis && semis.length === 2) {
      const [a, b] = semis.map(({ match, winner }) =>
        winner === match.homeCode ? match.awayCode : match.homeCode,
      );
      derived.push({
        matchId: "derived-third-1",
        round: "third",
        homeCode: a,
        awayCode: b,
        kickoffIso: roundKickoff("third"),
      });
    }
  }

  return derived;
}

/**
 * Bonus Score Picks for the closing games (3rd place + Final) that aren't
 * already tracked — created from the drawn matchups under the standard
 * eligibility rule: only a game with a LatAm side or Spain gets a score match.
 */
export function marqueeScoreMatches(
  matches: LiveMatch[],
  existing: Pick<ScoreMatch, "matchId">[],
): ScoreMatch[] {
  const have = new Set(existing.map((m) => m.matchId));
  const out: ScoreMatch[] = [];
  for (const round of ["third", "final"] as const) {
    const m = matches.find((x) => x.round === round);
    if (!m?.kickoffIso) continue;
    if (!isScorePickEligible(m.homeCode) && !isScorePickEligible(m.awayCode)) continue;
    const built = buildScoreMatch({
      fixtureId: null,
      kickoffIso: m.kickoffIso,
      homeCode: m.homeCode,
      awayCode: m.awayCode,
    });
    if (!have.has(built.matchId)) out.push(built);
  }
  return out;
}
