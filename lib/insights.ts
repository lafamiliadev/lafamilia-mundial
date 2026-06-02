import { playerName } from "./players";
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
  const bars: InsightBar[] = top.map(([key, count]) => {
    const meta = labelFor(key);
    return {
      key,
      label: meta.label,
      flag: meta.flag,
      count,
      pct: Math.round((count / total) * 100),
    };
  });
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

const teamLabel = (code: string) => ({ label: teamName(code), flag: teamFlag(code) });

export function computeInsights(participants: Participant[]): InsightBlock[] {
  return [
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
      id: "darkhorse",
      emoji: "🔥",
      title: "Most popular dark horse",
      bars: tally(participants, (p) => p.predictions.darkHorse, teamLabel),
    },
    {
      id: "goldenboot",
      emoji: "🌟",
      title: "Most predicted Golden Boot",
      bars: tally(participants, (p) => p.predictions.goldenBoot, (id) => ({
        label: playerName(id),
        flag: undefined,
      })),
    },
    {
      id: "latam",
      emoji: "🌶️",
      title: "LatAm team Familia believes in most",
      bars: tally(participants, (p) => p.predictions.latamFurthest, teamLabel),
    },
  ];
}
