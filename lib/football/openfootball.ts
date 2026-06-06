import { resolveTeamCode } from "../teams";
import { EMPTY_RESULTS, type GroupMap, type LiveMatch, type Results, type Stage } from "../types";
import type { FootballProvider, ProviderStatus } from "./provider";

// Free, public-domain provider (github.com/openfootball/worldcup.json).
// No API key. Used for local dev + zero-cost production fallback. Best-effort:
// derives group composition + winners + knockout stages from the match list.
// Pre-tournament it returns empty groups/results (nothing played) — honest, and
// the admin "Sync tournament" pulls the real draw from API-Football when keyed.

const SOURCE =
  "https://raw.githubusercontent.com/openfootball/worldcup.json/master/2026/worldcup.json";

type MatchJson = {
  round?: string;
  group?: string;
  team1?: { name?: string };
  team2?: { name?: string };
  score?: { ft?: [number, number] };
};

/** "Group A" / "A" → "A" (group-stage matches only). */
function groupLetter(raw: string | undefined): string | null {
  if (!raw) return null;
  const m = raw.match(/group\s*([A-L])/i) ?? raw.match(/^([A-L])$/i);
  return m ? m[1].toUpperCase() : null;
}

function roundToStage(round: string | undefined): Stage | null {
  if (!round) return null;
  const r = round.toLowerCase();
  if (r.includes("round of 16") || r.includes("round of 32")) return "r16";
  if (r.includes("quarter")) return "qf";
  if (r.includes("semi")) return "sf";
  if (r.includes("final")) return "final";
  return null;
}

async function load(): Promise<MatchJson[]> {
  const res = await fetch(SOURCE, { signal: AbortSignal.timeout(8000) });
  if (!res.ok) return [];
  const json = (await res.json()) as { matches?: MatchJson[] };
  return json.matches ?? [];
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

  async fetchGroups(): Promise<GroupMap> {
    try {
      const matches = await load();
      const groups: GroupMap = {};
      for (const m of matches) {
        const letter = groupLetter(m.group ?? m.round);
        if (!letter) continue;
        for (const code of [resolveTeamCode(m.team1?.name), resolveTeamCode(m.team2?.name)]) {
          if (!code) continue;
          groups[letter] = groups[letter] ?? [];
          if (!groups[letter].includes(code)) groups[letter].push(code);
        }
      }
      return groups;
    } catch {
      return {};
    }
  }

  async fetchResults(): Promise<Results> {
    try {
      const matches = await load();

      // --- Group standings → winners (only for fully-played groups) ---
      type Row = { code: string; pts: number; gd: number; gf: number; played: number };
      const tables = new Map<string, Map<string, Row>>();
      const ensure = (letter: string, code: string) => {
        const t = tables.get(letter) ?? new Map<string, Row>();
        tables.set(letter, t);
        const row = t.get(code) ?? { code, pts: 0, gd: 0, gf: 0, played: 0 };
        t.set(code, row);
        return row;
      };

      for (const m of matches) {
        const letter = groupLetter(m.group ?? m.round);
        if (!letter || !m.score?.ft) continue;
        const c1 = resolveTeamCode(m.team1?.name);
        const c2 = resolveTeamCode(m.team2?.name);
        if (!c1 || !c2) continue;
        const [s1, s2] = m.score.ft;
        const r1 = ensure(letter, c1);
        const r2 = ensure(letter, c2);
        r1.played++; r2.played++;
        r1.gf += s1; r2.gf += s2;
        r1.gd += s1 - s2; r2.gd += s2 - s1;
        if (s1 > s2) r1.pts += 3;
        else if (s2 > s1) r2.pts += 3;
        else { r1.pts += 1; r2.pts += 1; }
      }

      const groupWinners: Record<string, string> = {};
      for (const [letter, table] of tables) {
        const rows = [...table.values()];
        // Group decided when 4 teams each played 3 (6 matches).
        const decided = rows.length === 4 && rows.every((r) => r.played >= 3);
        if (!decided) continue;
        rows.sort((a, b) => b.pts - a.pts || b.gd - a.gd || b.gf - a.gf || a.code.localeCompare(b.code));
        groupWinners[letter] = rows[0].code;
      }

      // --- Knockout stages + champion ---
      const stageReached: Partial<Record<Stage, string[]>> = {};
      const add = (stage: Stage, code: string | null) => {
        if (!code) return;
        stageReached[stage] = stageReached[stage] ?? [];
        if (!stageReached[stage]!.includes(code)) stageReached[stage]!.push(code);
      };
      let champion: string | null = null;
      for (const m of matches) {
        if (groupLetter(m.group ?? m.round)) continue; // skip group matches
        const stage = roundToStage(m.round);
        if (!stage || !m.score?.ft) continue;
        const c1 = resolveTeamCode(m.team1?.name);
        const c2 = resolveTeamCode(m.team2?.name);
        add(stage, c1);
        add(stage, c2);
        if (stage === "final") {
          const [s1, s2] = m.score.ft;
          champion = s1 >= s2 ? c1 : c2;
          if (champion) add("champion", champion);
        }
      }

      return { ...EMPTY_RESULTS, champion, groupWinners, stageReached };
    } catch {
      return EMPTY_RESULTS;
    }
  }

  /** OpenFootball doesn't supply per-match knockout matchups with stable ids, so
   * the Live Picks matchups are admin-entered when running on this provider. */
  async fetchKnockoutMatches(): Promise<LiveMatch[]> {
    return [];
  }
}
