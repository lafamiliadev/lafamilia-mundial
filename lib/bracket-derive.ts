// Draw the bracket forward from our own recorded results — no provider needed.
//
// Born of WC2026: the football API's knockout feed died after the R16 (plan
// downgrade), and every later matchup + marquee score match had to be entered
// by hand. These pure helpers derive what the bracket already implies:
//
// 1. deriveNextRoundMatchups — once EVERY match of a round has a confirmed
//    winner and the next round hasn't been drawn (by provider or admin), pair
//    the winners into next-round matchups. Pairing follows bracket order,
//    approximated by kickoff order within the round (exact for sf → final,
//    FIFA convention for earlier rounds); the admin matchup editor and the
//    provider reconcile (which re-keys by round + teams, carrying picks)
//    always win over a derived entry.
// 2. marqueeScoreMatches — the Final and the 3rd-place game are marquee:
//    everyone gets a Bonus Score Pick on them, regardless of the LatAm/Spain
//    rule that governs earlier rounds. Derived from the drawn Final matchup
//    and the semifinal losers.
//
// Both are idempotent: they only return what doesn't already exist, so calling
// them on every recompute is safe.

import { LIVE_ROUNDS } from "./schedule";
import { buildScoreMatch } from "./score-match-sync";
import { KNOCKOUT_ROUNDS, type LiveMatch, type ScoreMatch } from "./types";

/** Bracket order within a round, approximated by kickoff (matchId tiebreak). */
function byBracketOrder(a: LiveMatch, b: LiveMatch): number {
  return (
    (a.kickoffIso ?? "").localeCompare(b.kickoffIso ?? "") ||
    a.matchId.localeCompare(b.matchId)
  );
}

/**
 * New matchups the bracket implies: for each undrawn round whose previous
 * round is fully decided, pair the winners in bracket order. Kickoff defaults
 * to the round's scheduled lock (= its first kickoff) from LIVE_ROUNDS, so the
 * derived game is pickable immediately and locks on time.
 */
export function deriveNextRoundMatchups(
  matches: LiveMatch[],
  matchWinners: Record<string, string>,
): LiveMatch[] {
  const derived: LiveMatch[] = [];
  for (let i = 0; i + 1 < KNOCKOUT_ROUNDS.length; i++) {
    const next = KNOCKOUT_ROUNDS[i + 1];
    if (matches.some((m) => m.round === next)) continue; // already drawn — provider/admin wins
    const prev = matches.filter((m) => m.round === KNOCKOUT_ROUNDS[i]).sort(byBracketOrder);
    // Only a complete, fully-decided round derives: an odd match count or a
    // missing winner would mean guessing at pairings.
    if (prev.length === 0 || prev.length % 2 !== 0) continue;
    const winners = prev.map((m) => matchWinners[m.matchId]);
    if (winners.some((w) => !w)) continue;
    const kickoffIso = LIVE_ROUNDS.find((r) => r.round === next)?.locksIso ?? null;
    for (let p = 0; p < winners.length; p += 2) {
      derived.push({
        matchId: `derived-${next}-${p / 2 + 1}`,
        round: next,
        homeCode: winners[p],
        awayCode: winners[p + 1],
        kickoffIso,
      });
    }
  }
  return derived;
}

/**
 * Marquee Bonus Score Picks the bracket implies but doesn't already track:
 * the Final (from the drawn final matchup) and the 3rd-place game (from the
 * semifinal losers, once both semis are decided). The 3rd-place kickoff can't
 * be derived from the bracket — it's passed in (edition config, like
 * LIVE_ROUNDS).
 */
export function marqueeScoreMatches(
  matches: LiveMatch[],
  matchWinners: Record<string, string>,
  existing: Pick<ScoreMatch, "matchId">[],
  thirdPlaceKickoffIso: string,
): ScoreMatch[] {
  const have = new Set(existing.map((m) => m.matchId));
  const out: ScoreMatch[] = [];
  const push = (homeCode: string, awayCode: string, kickoffIso: string) => {
    const built = buildScoreMatch({ fixtureId: null, kickoffIso, homeCode, awayCode });
    if (!have.has(built.matchId)) out.push(built);
  };

  const final = matches.find((m) => m.round === "final");
  if (final?.kickoffIso) push(final.homeCode, final.awayCode, final.kickoffIso);

  const semis = matches.filter((m) => m.round === "sf").sort(byBracketOrder);
  if (semis.length === 2) {
    const losers = semis.map((m) => {
      const winner = matchWinners[m.matchId];
      if (!winner) return null;
      return winner === m.homeCode ? m.awayCode : m.homeCode;
    });
    if (losers[0] && losers[1]) push(losers[0], losers[1], thirdPlaceKickoffIso);
  }
  return out;
}
