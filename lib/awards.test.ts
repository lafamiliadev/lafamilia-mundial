import { describe, expect, it } from "vitest";
import { computeAwards } from "./awards";
import { EMPTY_RESULTS } from "./types";
import type { Participant, Predictions, Results } from "./types";

const LETTERS = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L"];
const ACTUAL = ["BRA", "ARG", "FRA", "ESP", "ENG", "POR", "NED", "GER", "MEX", "USA", "JPN", "MAR"];

function groups(codes: string[]): Record<string, string> {
  const out: Record<string, string> = {};
  codes.forEach((c, i) => (out[LETTERS[i]] = c));
  return out;
}

function participant(
  id: string,
  name: string,
  rootingCountry: string,
  predictions: Predictions,
): Participant {
  return {
    id,
    name,
    email: `${id}@x.com`,
    rootingCountry,
    resumeToken: `tok-${id}`,
    slug: name.toLowerCase(),
    referredBy: null,
    referralVisits: 0,
    crewCode: null,
    city: null,
    createdAt: "2026-06-03T00:00:00Z",
    predictions,
  };
}

const results: Results = {
  ...EMPTY_RESULTS,
  champion: "ARG",
  groupWinners: groups(ACTUAL),
  stageReached: { sf: ["BRA", "FRA", "ESP", "ARG"] },
};

// Maria: 11/12 groups, perfect Final Four, champion ARG (correct)
const maria = participant("p1", "Maria", "ARG", {
  groupWinners: groups([...ACTUAL.slice(0, 11), "ITA"]),
  semifinalists: ["BRA", "FRA", "ESP", "ARG"],
  champion: "ARG",
  finalTotalGoals: 3,
  bonus: null,
});
// Carlos: 8/12 groups, 3/4 Final Four, champion BRA
const carlos = participant("p2", "Carlos", "BRA", {
  groupWinners: groups([...ACTUAL.slice(0, 8), "ITA", "POL", "DEN", "SRB"]),
  semifinalists: ["BRA", "FRA", "ESP", "GER"],
  champion: "BRA",
  finalTotalGoals: 2,
  bonus: null,
});
// Sofia: 12/12 groups, perfect Final Four, big climber, not LatAm
const sofia = participant("p3", "Sofia", "USA", {
  groupWinners: groups(ACTUAL),
  semifinalists: ["BRA", "FRA", "ESP", "ARG"],
  champion: "ESP",
  finalTotalGoals: 4,
  bonus: null,
});

const scores = {
  p1: { rank: 1, total: 200, startRank: 5 }, // climb 4
  p2: { rank: 2, total: 150, startRank: 2 }, // climb 0
  p3: { rank: 3, total: 140, startRank: 8 }, // climb 5
};

describe("computeAwards", () => {
  const { champion, honors } = computeAwards([maria, carlos, sofia], scores, results);
  const byId = Object.fromEntries(honors.map((h) => [h.id, h]));

  it("crowns La Copa to the rank-1 predictor", () => {
    expect(champion?.winners[0].name).toBe("Maria");
  });

  it("gives El Oráculo to the most accurate group-stage caller", () => {
    expect(byId.oraculo.winners[0].name).toBe("Sofia");
    expect(byId.oraculo.winners[0].detail).toContain("12 of 12");
  });

  it("awards Final Four Perfecto to everyone who nailed all four", () => {
    expect(byId.finalfour.title).toBe("Final Four Perfecto");
    expect(byId.finalfour.winners.map((w) => w.name).sort()).toEqual(["Maria", "Sofia"]);
  });

  it("gives El Escalador to the biggest climber", () => {
    expect(byId.escalador.winners[0].name).toBe("Sofia");
    expect(byId.escalador.winners[0].detail).toContain("5 spots");
  });

  it("gives Orgullo Latino to the top predictor repping a LatAm side", () => {
    expect(byId.orgullo.winners[0].name).toBe("Maria"); // Sofia roots USA (not LatAm)
  });
});

describe("computeAwards — Dark Horse / Valiente / Familia", () => {
  const pred = (champion: string, darkHorse: string | null = null): Predictions => ({
    groupWinners: null,
    semifinalists: null,
    champion,
    finalTotalGoals: 3,
    bonus: darkHorse ? { goldenBall: null, goldenBoot: null, goldenGlove: null, darkHorse } : null,
  });

  it("does NOT crown La Copa before the Final (no champion set, 0 pts)", () => {
    const pilar = participant("x", "Pilar", "COL", pred("ARG"));
    const { champion } = computeAwards(
      [pilar],
      { x: { rank: 1, total: 0, startRank: 1 } },
      EMPTY_RESULTS, // no results.champion → tournament not over
    );
    expect(champion).toBeNull();
  });

  it("Dark Horse Whisperer goes to whoever's dark horse ran deepest", () => {
    const r: Results = { ...EMPTY_RESULTS, stageReached: { qf: ["ECU"] } };
    const ana = participant("a", "Ana", "ECU", pred("ARG", "ECU")); // dark horse reached QF
    const ben = participant("b", "Ben", "BRA", pred("BRA", "JPN")); // dark horse went nowhere
    const { honors } = computeAwards(
      [ana, ben],
      { a: { rank: 1, total: 10, startRank: 1 }, b: { rank: 2, total: 5, startRank: 2 } },
      r,
    );
    const dh = honors.find((h) => h.id === "darkhorse");
    expect(dh?.winners[0].name).toBe("Ana");
    expect(dh?.winners[0].detail).toContain("quarterfinals");
  });

  it("El Valiente rewards the bold champion pick among top scorers", () => {
    const a = participant("a", "Popular1", "ARG", pred("FRA"));
    const b = participant("b", "Popular2", "ARG", pred("FRA"));
    const c = participant("c", "Brave", "ARG", pred("NZL")); // rare champion, top score
    const { honors } = computeAwards(
      [a, b, c],
      {
        a: { rank: 2, total: 50, startRank: 2 },
        b: { rank: 3, total: 40, startRank: 3 },
        c: { rank: 1, total: 60, startRank: 1 },
      },
      EMPTY_RESULTS,
    );
    expect(honors.find((h) => h.id === "valiente")?.winners[0].name).toBe("Brave");
  });

  it("Trae a la Familia goes to the top inviter", () => {
    const host = participant("h", "Host", "ARG", pred("ARG")); // slug "host"
    const g1 = { ...participant("g1", "Gee", "BRA", pred("BRA")), referredBy: "host" };
    const g2 = { ...participant("g2", "Bee", "BRA", pred("BRA")), referredBy: "host" };
    const { honors } = computeAwards(
      [host, g1, g2],
      {
        h: { rank: 1, total: 5, startRank: 1 },
        g1: { rank: 2, total: 0, startRank: 2 },
        g2: { rank: 3, total: 0, startRank: 3 },
      },
      EMPTY_RESULTS,
    );
    const fam = honors.find((h) => h.id === "familia");
    expect(fam?.winners[0].name).toBe("Host");
    expect(fam?.winners[0].detail).toContain("2 people");
  });

  it("Trae a la Familia skips the LaFamilia team and takes the next member", () => {
    // Pilar (team, @lafamiliafoundation.com) brought 3; Pedro (member) brought 1.
    const pilar = { ...participant("s", "Pilar", "COL", pred("ARG")), email: "pilar@lafamiliafoundation.com" };
    const pedro = participant("r", "Pedro", "ECU", pred("ECU")); // slug "pedro"
    const a = { ...participant("a", "A", "BRA", pred("BRA")), referredBy: "pilar" };
    const b = { ...participant("b", "B", "BRA", pred("BRA")), referredBy: "pilar" };
    const c = { ...participant("c", "C", "BRA", pred("BRA")), referredBy: "pilar" };
    const d = { ...participant("d", "D", "BRA", pred("BRA")), referredBy: "pedro" };
    const { honors } = computeAwards([pilar, pedro, a, b, c, d], {}, EMPTY_RESULTS);
    const fam = honors.find((h) => h.id === "familia");
    expect(fam?.winners[0].name).toBe("Pedro"); // team member excluded
    expect(fam?.winners[0].detail).toContain("1 person");
  });
});
