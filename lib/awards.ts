import { TEAM_BY_CODE, teamName } from "./teams";
import type { Participant, Results } from "./types";

// La Familia Honors — five titles, all derived from the picks members already
// made (no extra input). One clear champion (La Copa); the rest celebrate a
// different kind of sharp call. Pure + deterministic → unit-testable, and reused
// by the /awards reveal page and the admin preview.

export type AwardWinner = {
  name: string;
  slug: string;
  rootingCountry: string | null;
  detail: string;
};

export type Award = {
  id: string;
  emoji: string;
  title: string;
  subtitle: string;
  winners: AwardWinner[];
};

export type AwardsResult = {
  champion: Award | null;
  honors: Award[];
};

/** Score lookup shape (subset of what repo.getScores returns). */
type ScoreLite = { rank: number; total: number; startRank: number };
type Scores = Record<string, ScoreLite>;

function correctGroupCount(p: Participant, results: Results): number {
  const picks = p.predictions.groupWinners ?? {};
  let n = 0;
  for (const [letter, actual] of Object.entries(results.groupWinners)) {
    if (actual && picks[letter] === actual) n++;
  }
  return n;
}

function winnerOf(p: Participant, detail: string): AwardWinner {
  return { name: p.name, slug: p.slug, rootingCountry: p.rootingCountry, detail };
}

export function computeAwards(
  participants: Participant[],
  scores: Scores,
  results: Results,
): AwardsResult {
  const rank = (p: Participant) => scores[p.id]?.rank ?? 0;
  const total = (p: Participant) => scores[p.id]?.total ?? 0;
  const semis = results.stageReached.sf ?? [];
  const groupsDecided = Object.values(results.groupWinners).filter(Boolean).length;

  // 🏆 La Copa — the one champion (rank 1; ties already broken by the goals
  // tiebreaker inside scoring).
  const championP = participants.find((p) => rank(p) === 1) ?? null;
  const champion: Award | null = championP
    ? {
        id: "lacopa",
        emoji: "🏆",
        title: "La Copa",
        subtitle: "Read the whole tournament better than anyone.",
        winners: [winnerOf(championP, `${total(championP)} pts. Sharpest bracket in the Familia.`)],
      }
    : null;

  const honors: Award[] = [];

  // 🔮 El Oráculo — most correct group winners (only once groups are decided).
  if (groupsDecided > 0) {
    let best = 0;
    for (const p of participants) best = Math.max(best, correctGroupCount(p, results));
    if (best > 0) {
      const tied = participants
        .filter((p) => correctGroupCount(p, results) === best)
        .sort((a, b) => total(b) - total(a) || a.name.localeCompare(b.name));
      honors.push({
        id: "oraculo",
        emoji: "🔮",
        title: "El Oráculo",
        subtitle: "Saw the group stage coming.",
        winners: [winnerOf(tied[0], `Called ${best} of 12 group winners.`)],
      });
    }
  }

  // 🎯 Final Four — everyone who nailed all four semifinalists; if nobody did,
  // the sharpest Final Four instead.
  if (semis.length >= 4) {
    const correct = (p: Participant) =>
      (p.predictions.semifinalists ?? []).filter((c) => semis.includes(c)).length;
    const perfect = participants.filter(
      (p) => (p.predictions.semifinalists ?? []).length === 4 && correct(p) === 4,
    );
    if (perfect.length) {
      honors.push({
        id: "finalfour",
        emoji: "🎯",
        title: "Final Four Perfecto",
        subtitle: "Four for four. No notes.",
        winners: perfect
          .sort((a, b) => total(b) - total(a) || a.name.localeCompare(b.name))
          .map((p) => winnerOf(p, "Nailed all four semifinalists.")),
      });
    } else {
      let best = 0;
      for (const p of participants) best = Math.max(best, correct(p));
      if (best > 0) {
        const top = participants
          .filter((p) => correct(p) === best)
          .sort((a, b) => total(b) - total(a) || a.name.localeCompare(b.name));
        honors.push({
          id: "finalfour",
          emoji: "🎯",
          title: "Sharpest Final Four",
          subtitle: "Closest read on the semifinals.",
          winners: [winnerOf(top[0], `${best} of 4 semifinalists.`)],
        });
      }
    }
  }

  // 🚀 El Escalador — biggest climb from the group-stage-end rank to now.
  let bestClimb = 0;
  let climber: Participant | null = null;
  for (const p of participants) {
    const s = scores[p.id];
    if (!s || s.startRank <= 0 || s.rank <= 0) continue;
    const climb = s.startRank - s.rank;
    if (climb > bestClimb) {
      bestClimb = climb;
      climber = p;
    }
  }
  if (climber && bestClimb > 0) {
    honors.push({
      id: "escalador",
      emoji: "🚀",
      title: "El Escalador",
      subtitle: "Started in the back, finished up front.",
      winners: [winnerOf(climber, `Climbed ${bestClimb} spot${bestClimb === 1 ? "" : "s"}.`)],
    });
  }

  // 🌎 Orgullo Latino — top predictor repping a LatAm side.
  const latinos = participants
    .filter((p) => p.rootingCountry && TEAM_BY_CODE[p.rootingCountry]?.isLatam)
    .sort((a, b) => total(b) - total(a) || a.name.localeCompare(b.name));
  if (latinos.length && total(latinos[0]) > 0) {
    const p = latinos[0];
    honors.push({
      id: "orgullo",
      emoji: "🌎",
      title: "Orgullo Latino",
      subtitle: "Repped the home side and delivered.",
      winners: [winnerOf(p, `Rooting for ${teamName(p.rootingCountry)}. Finished #${rank(p)}.`)],
    });
  }

  return { champion, honors };
}
