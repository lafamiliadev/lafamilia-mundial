import { env } from "../env";
import { resolveTeamCode } from "../teams";
import { EMPTY_RESULTS, type GroupMap, type Results, type Stage } from "../types";
import type { FootballProvider, ProviderStatus } from "./provider";

// Production provider: API-Football (api-sports.io v3). The World Cup is league
// id 1; season 2026. Reliable, affordable, explicit WC2026 coverage.
// - Group composition + group winners come from /standings (all 12 group tables).
// - Knockout-round team lists + champion come from /fixtures.
// The admin override always wins, so this stays safe even if a round name shifts.

const BASE = "https://v3.football.api-sports.io";
const WORLD_CUP_LEAGUE_ID = 1;
const SEASON = 2026;

/** "Group A" / "Group: A" / "A" → "A". */
function groupLetter(raw: string | undefined): string | null {
  if (!raw) return null;
  const m = raw.match(/([A-L])\s*$/i);
  return m ? m[1].toUpperCase() : null;
}

function roundToStage(round: string | undefined): Stage | null {
  if (!round) return null;
  const r = round.toLowerCase();
  if (r.includes("16")) return "r16";
  if (r.includes("quarter")) return "qf";
  if (r.includes("semi")) return "sf";
  if (r.includes("final")) return "final"; // 3rd-place excluded by caller
  return null;
}

type StandingRow = {
  rank?: number;
  group?: string;
  team?: { name?: string };
  all?: { played?: number };
};

export class ApiFootballProvider implements FootballProvider {
  readonly name = "api-football";

  private headers() {
    if (!env.FOOTBALL_API_KEY) throw new Error("FOOTBALL_API_KEY is not set.");
    return { "x-apisports-key": env.FOOTBALL_API_KEY };
  }

  async status(): Promise<ProviderStatus> {
    const fetchedAt = new Date().toISOString();
    try {
      const res = await fetch(`${BASE}/status`, {
        headers: this.headers(),
        signal: AbortSignal.timeout(8000),
      });
      const json = (await res.json()) as {
        response?: { requests?: { current?: number; limit_day?: number } };
      };
      const reqs = json.response?.requests;
      return {
        provider: this.name,
        ok: res.ok,
        detail: res.ok
          ? `API-Football OK — ${reqs?.current ?? "?"}/${reqs?.limit_day ?? "?"} requests today.`
          : `API-Football returned ${res.status}.`,
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

  private async fetchStandings(): Promise<StandingRow[][]> {
    const res = await fetch(
      `${BASE}/standings?league=${WORLD_CUP_LEAGUE_ID}&season=${SEASON}`,
      { headers: this.headers(), signal: AbortSignal.timeout(8000) },
    );
    const json = (await res.json()) as {
      response?: { league?: { standings?: StandingRow[][] } }[];
    };
    return json.response?.[0]?.league?.standings ?? [];
  }

  /** Group composition (letter → up to 4 codes). Works pre-tournament. */
  async fetchGroups(): Promise<GroupMap> {
    try {
      const standings = await this.fetchStandings();
      const groups: GroupMap = {};
      for (const table of standings) {
        for (const row of table) {
          const letter = groupLetter(row.group);
          const code = resolveTeamCode(row.team?.name);
          if (!letter || !code) continue;
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
    const results: Results = { ...EMPTY_RESULTS, groupWinners: {}, stageReached: {} };

    // 1) Group winners — rank 1 of each FINISHED group (every team played 3).
    try {
      const standings = await this.fetchStandings();
      for (const table of standings) {
        if (!table.length) continue;
        const allPlayed = table.every((r) => (r.all?.played ?? 0) >= 3);
        if (!allPlayed) continue; // group not decided yet
        const winner = table.find((r) => r.rank === 1) ?? table[0];
        const letter = groupLetter(winner.group);
        const code = resolveTeamCode(winner.team?.name);
        if (letter && code) results.groupWinners[letter] = code;
      }
    } catch {
      /* leave group winners as-is */
    }

    // 2) Knockout fixtures → per-stage team lists + champion.
    try {
      const res = await fetch(
        `${BASE}/fixtures?league=${WORLD_CUP_LEAGUE_ID}&season=${SEASON}`,
        { headers: this.headers(), signal: AbortSignal.timeout(8000) },
      );
      const json = (await res.json()) as {
        response?: {
          league?: { round?: string };
          teams?: {
            home?: { name?: string; winner?: boolean };
            away?: { name?: string; winner?: boolean };
          };
          fixture?: { status?: { short?: string } };
        }[];
      };
      const add = (stage: Stage, code: string | null) => {
        if (!code) return;
        results.stageReached[stage] = results.stageReached[stage] ?? [];
        if (!results.stageReached[stage]!.includes(code))
          results.stageReached[stage]!.push(code);
      };
      for (const fx of json.response ?? []) {
        const round = fx.league?.round ?? "";
        if (round.toLowerCase().includes("3rd")) continue; // ignore 3rd-place
        const stage = roundToStage(round);
        if (!stage) continue;
        const finished = fx.fixture?.status?.short === "FT";
        const home = resolveTeamCode(fx.teams?.home?.name);
        const away = resolveTeamCode(fx.teams?.away?.name);
        add(stage, home);
        add(stage, away);
        if (stage === "final" && finished) {
          const homeWon = fx.teams?.home?.winner === true;
          const champ = homeWon ? home : away;
          results.champion = champ;
          if (champ) add("champion", champ);
        }
      }
    } catch {
      /* leave stages as-is */
    }

    return results;
  }
}
