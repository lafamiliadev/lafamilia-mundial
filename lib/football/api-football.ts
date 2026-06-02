import { env } from "../env";
import { TEAMS } from "../teams";
import { EMPTY_RESULTS, type Results, type Stage } from "../types";
import type { FootballProvider, ProviderStatus } from "./provider";

// Production provider: API-Football (api-sports.io v3). The World Cup is league
// id 1; season 2026. Reliable, affordable, explicit WC2026 coverage.
// Knockout-round → stage mapping is finalized closer to the event; the admin
// override always wins, so this stays safe even if a round name shifts.

const BASE = "https://v3.football.api-sports.io";
const WORLD_CUP_LEAGUE_ID = 1;
const SEASON = 2026;

const NAME_TO_CODE = new Map<string, string>(
  TEAMS.map((t) => [t.name.toLowerCase(), t.code]),
);
function resolveCode(name: string | undefined): string | null {
  if (!name) return null;
  return NAME_TO_CODE.get(name.trim().toLowerCase()) ?? null;
}

function roundToStage(round: string | undefined): Stage | null {
  if (!round) return null;
  const r = round.toLowerCase();
  if (r.includes("16")) return "r16";
  if (r.includes("quarter")) return "qf";
  if (r.includes("semi")) return "sf";
  if (r.includes("final")) return "final"; // 3rd-place excluded below
  return null;
}

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

  async fetchResults(): Promise<Results> {
    const results: Results = { ...EMPTY_RESULTS, stageReached: {} };

    // 1) Top scorer → Golden Boot (by player, mapped to our shortlist by name).
    try {
      const res = await fetch(
        `${BASE}/players/topscorers?league=${WORLD_CUP_LEAGUE_ID}&season=${SEASON}`,
        { headers: this.headers(), signal: AbortSignal.timeout(8000) },
      );
      const json = (await res.json()) as {
        response?: { player?: { name?: string } }[];
      };
      const topName = json.response?.[0]?.player?.name;
      if (topName) {
        // We store golden boot as a curated player id; surface raw name for admin.
        results.goldenBoot = topName.toLowerCase().replace(/\s+/g, "-");
      }
    } catch {
      /* leave golden boot unset */
    }

    // 2) Knockout fixtures → per-stage team lists + champion/runner-up.
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
        const home = resolveCode(fx.teams?.home?.name);
        const away = resolveCode(fx.teams?.away?.name);
        add(stage, home);
        add(stage, away);
        if (stage === "final" && finished) {
          const homeWon = fx.teams?.home?.winner === true;
          const champ = homeWon ? home : away;
          const runner = homeWon ? away : home;
          results.champion = champ;
          results.runnerUp = runner;
          if (champ) add("champion", champ);
        }
      }
    } catch {
      /* leave stages as-is */
    }

    return results;
  }
}
