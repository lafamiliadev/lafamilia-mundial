import { describe, expect, it } from "vitest";
import { computeFunFacts } from "./fun-facts";
import type { Participant } from "./types";

let seq = 0;
function p(
  name: string,
  champion: string | null,
  opts: { ff?: string[]; rooting?: string | null; city?: string | null } = {},
): Participant {
  seq += 1;
  return {
    id: `id-${seq}`,
    name,
    email: `${name}@x.com`,
    rootingCountry: opts.rooting ?? null,
    resumeToken: `tok-${seq}`,
    slug: name.toLowerCase(),
    referredBy: null,
    referralVisits: 0,
    crewCode: null,
    city: opts.city ?? null,
    createdAt: "2026-06-01T00:00:00.000Z",
    predictions: {
      groupWinners: null,
      semifinalists: opts.ff ?? null,
      champion,
      finalTotalGoals: 3,
      bonus: null,
    },
  };
}

const ids = (facts: ReturnType<typeof computeFunFacts>) => facts.map((f) => f.id);
const BANNED = /\bepic\b|\blegendary\b|\bwild\b|\bchaos\b/i;

describe("computeFunFacts — observations", () => {
  it("returns nothing with no champion picks", () => {
    expect(computeFunFacts([p("A", null), p("B", null)])).toEqual([]);
  });

  it("always returns at least one observation when people have picked", () => {
    expect(computeFunFacts([p("A", "ARG")]).length).toBeGreaterThan(0);
  });

  it("observations are multi-line and avoid clichés", () => {
    const facts = computeFunFacts([
      p("Ana", "FRA", { ff: ["ENG", "FRA", "ESP", "ARG"], rooting: "MEX", city: "Miami" }),
      p("Bea", "FRA", { ff: ["ENG", "FRA", "ESP", "ARG"], rooting: "MEX", city: "Miami" }),
      p("Cid", "ESP", { ff: ["ENG", "BRA", "ARG", "POR"], rooting: "MEX", city: "Austin" }),
      p("Dan", "MEX", { ff: ["ENG", "USA", "CAN", "JPN"], rooting: "MEX", city: "Austin" }),
    ]);
    expect(facts.length).toBeGreaterThan(0);
    for (const f of facts) {
      expect(f.text).toContain("\n"); // every observation is multi-line
      expect(f.text).not.toMatch(BANNED);
    }
  });

  it("notices heart vs brain (rooted-for team few picked to win)", () => {
    const facts = computeFunFacts([
      p("A", "FRA", { rooting: "MEX" }),
      p("B", "FRA", { rooting: "MEX" }),
      p("C", "FRA", { rooting: "MEX" }),
      p("D", "MEX", { rooting: "MEX" }),
    ]);
    const f = facts.find((x) => x.id === "heart-brain");
    expect(f).toBeTruthy();
    expect(f!.text).toContain("Mexico");
    expect(f!.text.toLowerCase()).toContain("rooting for");
  });

  it("notices believers-not-champions (deep in Final Fours, nobody crowns them)", () => {
    const facts = computeFunFacts([
      p("A", "FRA", { ff: ["ENG", "FRA", "ESP", "ARG"] }),
      p("B", "ESP", { ff: ["ENG", "BRA", "ARG", "POR"] }),
      p("C", "ARG", { ff: ["ENG", "NED", "BRA", "GER"] }),
      p("D", "BRA", { ff: ["ENG", "USA", "MEX", "JPN"] }),
    ]);
    const f = facts.find((x) => x.id === "believers");
    expect(f).toBeTruthy();
    expect(f!.text).toContain("England");
    expect(f!.text).toContain("Final Four");
  });

  it("notices a contrarian standing alone", () => {
    const facts = computeFunFacts([p("Ana", "FRA"), p("Bea", "FRA"), p("Cid", "NZL")]);
    const f = facts.find((x) => x.id.startsWith("contrarian-"));
    expect(f).toBeTruthy();
    expect(f!.text).toContain("Cid");
    expect(f!.text.toLowerCase()).toContain("only one");
  });

  it("notices near-identical brackets (friend dynamics)", () => {
    const ff = ["ARG", "BRA", "FRA", "ESP"];
    const facts = computeFunFacts([
      p("Ana", "ARG", { ff }),
      p("Bea", "ARG", { ff }),
      p("Cid", "MEX", { ff: ["MEX", "USA", "CAN", "JPN"] }),
    ]);
    const f = facts.find((x) => x.id === "twins");
    expect(f).toBeTruthy();
    expect(f!.text).toMatch(/Ana|Bea/);
  });

  it("does not repeat a team across observations", () => {
    const facts = computeFunFacts([
      p("A", "FRA", { rooting: "FRA" }),
      p("B", "ARG", { rooting: "ARG" }),
      p("C", "ESP", { rooting: "ESP" }),
    ]);
    // ids are unique (no duplicate observations)
    expect(new Set(ids(facts)).size).toBe(facts.length);
  });
});
