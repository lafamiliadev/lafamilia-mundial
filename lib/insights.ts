import { teamFlag, teamName } from "./teams";
import type { Participant } from "./types";

// Pure community-insight aggregation. Both the dev store and Supabase feed the
// same participant list in, so insights stay identical across environments.

export type InsightBar = {
  key: string;
  label: string;
  flag?: string;
  count: number;
  pct: number;
};

export type InsightBlock = {
  id: string;
  emoji: string;
  title: string;
  bars: InsightBar[];
};

const teamLabel = (code: string) => ({ label: teamName(code), flag: teamFlag(code) });

function tally(
  participants: Participant[],
  pick: (p: Participant) => string | null,
  labelFor: (key: string) => { label: string; flag?: string },
  topN = 5,
): InsightBar[] {
  const counts = new Map<string, number>();
  let total = 0;
  for (const p of participants) {
    const key = pick(p);
    if (!key) continue;
    counts.set(key, (counts.get(key) ?? 0) + 1);
    total++;
  }
  if (total === 0) return [];
  const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1]);
  const top = sorted.slice(0, topN);
  const bars: InsightBar[] = top.map(([key, count]) => ({
    key,
    ...labelFor(key),
    count,
    pct: Math.round((count / total) * 100),
  }));
  const otherCount = sorted.slice(topN).reduce((s, [, c]) => s + c, 0);
  if (otherCount > 0) {
    bars.push({
      key: "__other",
      label: "Other",
      count: otherCount,
      pct: Math.round((otherCount / total) * 100),
    });
  }
  return bars;
}

/** Tally a multi-pick field (e.g. Final Four). Pct = share of Familia who put
 * that team in their picks. */
function tallyMany(
  participants: Participant[],
  pickMany: (p: Participant) => string[],
  topN = 6,
): InsightBar[] {
  const counts = new Map<string, number>();
  let totalParticipants = 0;
  for (const p of participants) {
    const keys = pickMany(p);
    if (!keys.length) continue;
    totalParticipants++;
    for (const k of keys) counts.set(k, (counts.get(k) ?? 0) + 1);
  }
  if (totalParticipants === 0) return [];
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, topN)
    .map(([key, count]) => ({
      key,
      ...teamLabel(key),
      count,
      pct: Math.round((count / totalParticipants) * 100),
    }));
}

/** The group where the community most disagrees on the winner — pure gold for a
 * "settle the debate" WhatsApp post. */
function contestedGroup(participants: Participant[]): InsightBlock | null {
  const byLetter = new Map<string, Map<string, number>>();
  for (const p of participants) {
    const gw = p.predictions.groupWinners ?? {};
    for (const [letter, code] of Object.entries(gw)) {
      const m = byLetter.get(letter) ?? new Map<string, number>();
      byLetter.set(letter, m);
      m.set(code, (m.get(code) ?? 0) + 1);
    }
  }
  let best: { letter: string; share: number; total: number; m: Map<string, number> } | null = null;
  for (const [letter, m] of byLetter) {
    const total = [...m.values()].reduce((a, b) => a + b, 0);
    if (total < 3) continue; // need enough picks to be meaningful
    const share = Math.max(...m.values()) / total;
    if (!best || share < best.share) best = { letter, share, total, m };
  }
  if (!best) return null;
  const bars = [...best.m.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([code, count]) => ({
      key: code,
      ...teamLabel(code),
      count,
      pct: Math.round((count / best!.total) * 100),
    }));
  return { id: "contested", emoji: "⚔️", title: `Most contested: Group ${best.letter}`, bars };
}

export function computeInsights(participants: Participant[]): InsightBlock[] {
  const blocks: InsightBlock[] = [
    {
      id: "rooting",
      emoji: "🌎",
      title: "Who Familia is rooting for",
      bars: tally(participants, (p) => p.rootingCountry, teamLabel),
    },
    {
      id: "champion",
      emoji: "🏆",
      title: "Most predicted champion",
      bars: tally(participants, (p) => p.predictions.champion, teamLabel),
    },
    {
      id: "finalfour",
      emoji: "🔥",
      title: "Most-picked Final Four teams",
      bars: tallyMany(participants, (p) => p.predictions.semifinalists ?? []),
    },
  ];
  const contested = contestedGroup(participants);
  if (contested) blocks.push(contested);
  return blocks;
}
