import { TEAM_BY_CODE, teamName } from "./teams";
import type { Participant, Results } from "./types";

// LaFamilia team/staff email domains. Members on these domains seeded the game
// (so they naturally top the invite count) — they're excluded from the
// participation award "Trae a la Familia" so a real member wins it.
const TEAM_EMAIL_DOMAINS = ["lafamiliafoundation.com", "vcfamilia.com"];

/** True for LaFamilia team/staff accounts — excluded from participation awards
 * and the public invite competition (they seeded the game). */
export function isTeamMember(p: Participant): boolean {
  const email = p.email.toLowerCase();
  return TEAM_EMAIL_DOMAINS.some((d) => email.endsWith(`@${d}`));
}

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

  // 🏆 La Copa — the one champion: highest overall score AFTER the Final.
  // Only crowned once the Final is actually played (results.champion is set) and
  // the leader has real points — so nobody is "winning" at 0 pts before kickoff.
  const tournamentOver = Boolean(results.champion);
  const championP = tournamentOver
    ? (participants.find((p) => rank(p) === 1 && total(p) > 0) ?? null)
    : null;
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

  // 🐴 Dark Horse Whisperer — whose Dark Horse ran the deepest.
  const dhDepth = (p: Participant): number => {
    const dh = p.predictions.bonus?.darkHorse;
    if (!dh) return 0;
    if ((results.stageReached.sf ?? []).includes(dh)) return 3;
    if ((results.stageReached.qf ?? []).includes(dh)) return 2;
    if ((results.stageReached.r16 ?? []).includes(dh)) return 1;
    return 0;
  };
  let maxDh = 0;
  for (const p of participants) maxDh = Math.max(maxDh, dhDepth(p));
  if (maxDh > 0) {
    const word = maxDh === 3 ? "semifinals" : maxDh === 2 ? "quarterfinals" : "Round of 16";
    const top = participants
      .filter((p) => dhDepth(p) === maxDh)
      .sort((a, b) => total(b) - total(a) || a.name.localeCompare(b.name))[0];
    const dh = top.predictions.bonus!.darkHorse!;
    honors.push({
      id: "darkhorse",
      emoji: "🐴",
      title: "Dark Horse Whisperer",
      subtitle: "Saw the surprise team coming.",
      winners: [winnerOf(top, `Their dark horse ${teamName(dh)} reached the ${word}.`)],
    });
  }

  // 🧨 El Valiente — boldest champion call among the people actually scoring.
  const champPop = new Map<string, number>();
  for (const p of participants) {
    const c = p.predictions.champion;
    if (c) champPop.set(c, (champPop.get(c) ?? 0) + 1);
  }
  const scoredWithChamp = participants
    .filter((p) => total(p) > 0 && p.predictions.champion)
    .sort((a, b) => total(b) - total(a));
  if (scoredWithChamp.length) {
    const topHalf = scoredWithChamp.slice(0, Math.max(1, Math.ceil(scoredWithChamp.length / 2)));
    const brave = [...topHalf].sort((a, b) => {
      const pa = champPop.get(a.predictions.champion!) ?? 99;
      const pb = champPop.get(b.predictions.champion!) ?? 99;
      if (pa !== pb) return pa - pb;
      return total(b) - total(a) || a.name.localeCompare(b.name);
    })[0];
    const c = brave.predictions.champion!;
    const n = champPop.get(c) ?? 1;
    honors.push({
      id: "valiente",
      emoji: "🧨",
      title: "El Valiente",
      subtitle: "Boldest call in the room — and it's working.",
      winners: [
        winnerOf(
          brave,
          `Backing ${teamName(c)} to win it all — ${n === 1 ? "the only one who did" : `one of only ${n}`} — and sitting #${rank(brave)}.`,
        ),
      ],
    });
  }

  // 🤝 Trae a la Familia — brought the most people into La Copa. Excludes the
  // LaFamilia team (they seeded the game) so a real member takes the honor.
  const broughtBy = new Map<string, number>();
  for (const p of participants) {
    if (p.referredBy) broughtBy.set(p.referredBy, (broughtBy.get(p.referredBy) ?? 0) + 1);
  }
  const bySlug = new Map(participants.map((p) => [p.slug, p]));
  const inviters = [...broughtBy.entries()]
    .map(([slug, n]) => ({ p: bySlug.get(slug), n }))
    .filter((c): c is { p: Participant; n: number } => Boolean(c.p) && !isTeamMember(c.p!))
    .sort((a, b) => b.n - a.n || total(b.p) - total(a.p) || a.p.name.localeCompare(b.p.name));
  if (inviters.length && inviters[0].n > 0) {
    const { p, n } = inviters[0];
    honors.push({
      id: "familia",
      emoji: "🤝",
      title: "Trae a la Familia",
      subtitle: "Opened the door for everyone else.",
      winners: [winnerOf(p, `Brought ${n} ${n === 1 ? "person" : "people"} into La Copa.`)],
    });
  }

  return { champion, honors };
}

// ── The full award catalog — every honor shown on /awards, ALWAYS, so the page
// is alive before/during/after the tournament. Winners attach by `id` from
// computeAwards(); a category with no winner yet shows its anticipatory state. ──
export type AwardGroupKey = "tournament" | "prediction" | "fun" | "community";

export const AWARD_GROUPS: { key: AwardGroupKey; emoji: string; title: string; blurb: string }[] = [
  { key: "tournament", emoji: "🏆", title: "Tournament Honors", blurb: "The big ones." },
  { key: "prediction", emoji: "⚽", title: "Prediction Honors", blurb: "Pure reading of the game." },
  { key: "fun", emoji: "😎", title: "Fun Honors", blurb: "Pure bragging rights." },
  { key: "community", emoji: "❤️", title: "Community Honors", blurb: "For the whole Familia." },
];

export type AwardCatalogEntry = {
  id: string;
  emoji: string;
  name: string;
  blurb: string;
  group: AwardGroupKey;
  /** Plain-language "how it's awarded". */
  howItsAwarded: string;
  /** When it becomes available — shown for anticipation. */
  availableAfter: string;
  /** Tournament ordering for the progress meter: 0 now → 5 the Final. */
  unlockOrder: number;
  /** Alive placeholder copy before a winner exists. */
  emptyState: string;
  /** The hero of the whole page. */
  featured?: boolean;
};

export const AWARD_CATALOG: AwardCatalogEntry[] = [
  {
    id: "lacopa",
    emoji: "🏆",
    name: "La Copa",
    group: "tournament",
    blurb: "The sharpest bracket in the whole Familia.",
    howItsAwarded: "Goes to whoever has the highest overall score once the Final is played.",
    availableAfter: "The Final",
    unlockOrder: 5,
    emptyState: "🏆 Crowned when the final whistle blows.",
    featured: true,
  },
  {
    id: "escalador",
    emoji: "🚀",
    name: "El Escalador",
    group: "tournament",
    blurb: "Started in the back, stormed to the front.",
    howItsAwarded: "The biggest climb up the leaderboard from the end of the group stage to the Final.",
    availableAfter: "The knockout rounds",
    unlockOrder: 2,
    emptyState: "🔥 Nobody's climbing yet — the group stage sets everyone's starting line.",
  },
  {
    id: "oraculo",
    emoji: "🔮",
    name: "El Oráculo",
    group: "prediction",
    blurb: "Saw the group stage before it happened.",
    howItsAwarded: "The most correct group winners — out of all 12 groups.",
    availableAfter: "The end of the Group Stage",
    unlockOrder: 1,
    emptyState: "⚽ Ask us again after the group stage.",
  },
  {
    id: "finalfour",
    emoji: "🎯",
    name: "Final Four Perfecto",
    group: "prediction",
    blurb: "Called the last four teams standing.",
    howItsAwarded:
      "Everyone who correctly picked all four semifinalists (or the closest read, if nobody nails all four).",
    availableAfter: "The Quarterfinals",
    unlockOrder: 3,
    emptyState: "🔮 The Final Four is still anybody's guess.",
  },
  {
    id: "darkhorse",
    emoji: "🐴",
    name: "Dark Horse Whisperer",
    group: "fun",
    blurb: "Backed the team nobody saw coming.",
    howItsAwarded: "Picked the Dark Horse team that ran the deepest into the tournament.",
    availableAfter: "The Round of 16",
    unlockOrder: 2,
    emptyState: "🌎 The dark horse is still hiding.",
  },
  {
    id: "valiente",
    emoji: "🧨",
    name: "El Valiente",
    group: "fun",
    blurb: "Made the boldest call — and it's paying off.",
    howItsAwarded: "The top scorer who picked a champion almost nobody else believed in.",
    availableAfter: "The end of the Group Stage",
    unlockOrder: 1,
    emptyState: "😏 Bold picks are brewing. Nobody knows yet — that's the fun part.",
  },
  {
    id: "orgullo",
    emoji: "🌎",
    name: "Orgullo Latino",
    group: "community",
    blurb: "Repped la patria and delivered.",
    howItsAwarded: "The highest-scoring participant rooting for a Latin American team.",
    availableAfter: "The first points (Group Stage)",
    unlockOrder: 1,
    emptyState: "🌎 Waiting for the first points to land.",
  },
  {
    id: "familia",
    emoji: "🤝",
    name: "Trae a la Familia",
    group: "community",
    blurb: "Brought the most people into La Copa.",
    howItsAwarded: "Whoever invited the most friends who went on to make their picks.",
    availableAfter: "Now — it's already on!",
    unlockOrder: 0,
    emptyState: "🔥 Be the first to bring your crew in — share your bracket.",
  },
];
