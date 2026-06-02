import { TEAMS } from "../teams";
import { EMPTY_RESULTS, type Results, type Stage } from "../types";
import type { FootballProvider, ProviderStatus } from "./provider";

// Free, public-domain provider (github.com/openfootball/worldcup.json).
// No API key. Used for local dev + zero-cost production fallback.
// Pre-tournament it simply returns empty results (nothing has been played yet),
// which scores everyone at 0 — correct and honest.

const SOURCE =
  "https://raw.githubusercontent.com/openfootball/worldcup.json/master/2026/worldcup.json";

// Best-effort name → our team code resolver.
const NAME_TO_CODE = new Map<string, string>(
  TEAMS.map((t) => [t.name.toLowerCase(), t.code]),
);
function resolveCode(name: string | undefined): string | null {
  if (!name) return null;
  return NAME_TO_CODE.get(name.trim().toLowerCase()) ?? null;
}

type MatchJson = {
  round?: string;
  team1?: { name?: string };
  team2?: { name?: string };
  score?: { ft?: [number, number] };
};

function roundToStage(round: string | undefined): Stage | null {
  if (!round) return null;
  const r = round.toLowerCase();
  if (r.includes("round of 16") || r.includes("round of 32")) return "r16";
  if (r.includes("quarter")) return "qf";
  if (r.includes("semi")) return "sf";
  if (r.includes("final")) return "final";
  return null;
}

export class OpenFootballProvider implements FootballProvider {
  readonly name = "openfootball";

  async status(): Promise<ProviderStatus> {
    const fetchedAt = new Date().toISOString();
    try {
      const res = await fetch(SOURCE, { signal: AbortSignal.timeout(8000) });
      return {
        provider: this.name,
        ok: res.ok,
        detail: res.ok
          ? "OpenFootball reachable (free, no key required)."
          : `OpenFootball returned ${res.status}.`,
        fetchedAt,
      };
    } catch (e) {
      return {
        provider: this.name,
        ok: false,
        detail: `Unreachable: ${(e as Error).message}`,
        fetchedAt,
      };
    }
  }

  async fetchResults(): Promise<Results> {
    try {
      const res = await fetch(SOURCE, { signal: AbortSignal.timeout(8000) });
      if (!res.ok) return EMPTY_RESULTS;
      const json = (await res.json()) as { matches?: MatchJson[] };
      const matches = json.matches ?? [];

      const stageReached: Partial<Record<Stage, string[]>> = {};
      const add = (stage: Stage, code: string | null) => {
        if (!code) return;
        stageReached[stage] = stageReached[stage] ?? [];
        if (!stageReached[stage]!.includes(code)) stageReached[stage]!.push(code);
      };

      let champion: string | null = null;
      let runnerUp: string | null = null;

      for (const m of matches) {
        const stage = roundToStage(m.round);
        if (!stage || !m.score?.ft) continue;
        const c1 = resolveCode(m.team1?.name);
        const c2 = resolveCode(m.team2?.name);
        add(stage, c1);
        add(stage, c2);
        if (stage === "final") {
          const [s1, s2] = m.score.ft;
          const winner = s1 >= s2 ? c1 : c2;
          const loser = s1 >= s2 ? c2 : c1;
          champion = winner;
          runnerUp = loser;
          if (winner) add("champion", winner);
        }
      }

      return { ...EMPTY_RESULTS, champion, runnerUp, stageReached };
    } catch {
      return EMPTY_RESULTS;
    }
  }
}
