import { env } from "../env";
import { resolveTeamCode } from "../teams";
import { EMPTY_RESULTS, type GroupMap, type LiveMatch, type Results } from "../types";
import { parseFixtureScores, parseKnockoutFixtures, type RawFixture } from "./parse-fixtures";
import type { FootballProvider, ProviderScore, ProviderStatus } from "./provider";

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

    // 2) Knockout fixtures → per-stage team lists, champion, AND per-match
    // winners (for the Live Picks game). Parsing is the tested pure function.
    try {
      const parsed = parseKnockoutFixtures(await this.fetchFixtures());
      results.stageReached = parsed.stageReached;
      results.champion = parsed.champion;
      results.matchWinners = parsed.matchWinners;
    } catch {
      /* leave knockout results as-is */
    }

    return results;
  }

  /** Raw knockout + group fixtures for the tournament. Throws a readable error
   * on transport/auth/quota failures so callers can surface WHY the feed is
   * empty instead of silently syncing nothing. */
  private async fetchFixtures(): Promise<RawFixture[]> {
    const res = await fetch(
      `${BASE}/fixtures?league=${WORLD_CUP_LEAGUE_ID}&season=${SEASON}`,
      { headers: this.headers(), signal: AbortSignal.timeout(8000) },
    );
    if (!res.ok) throw new Error(`API-Football /fixtures returned HTTP ${res.status}.`);
    const json = (await res.json()) as {
      response?: RawFixture[];
      errors?: Record<string, string> | string[];
    };
    // API-Football reports auth/quota/param problems as HTTP 200 with an
    // `errors` payload and an empty response — treat those as failures, not
    // as "no games today".
    const errs = json.errors;
    const errText = Array.isArray(errs)
      ? errs.join("; ")
      : errs
        ? Object.entries(errs)
            .map(([k, v]) => `${k}: ${v}`)
            .join("; ")
        : "";
    if (errText) throw new Error(`API-Football /fixtures error — ${errText}`);
    return json.response ?? [];
  }

  /** Knockout matchups (who plays whom) for the Live Picks pick cards. */
  async fetchKnockoutMatches(): Promise<LiveMatch[]> {
    return parseKnockoutFixtures(await this.fetchFixtures()).matches;
  }

  /** Final scores + status for every fixture (group stage included), for the
   * bonus score-prediction matches. Same /fixtures call as the other readers. */
  async fetchScores(): Promise<ProviderScore[]> {
    return parseFixtureScores(await this.fetchFixtures());
  }
}
