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
