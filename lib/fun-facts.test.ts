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

describe("computeFunFacts", () => {
  it("returns nothing with no champion picks", () => {
    expect(computeFunFacts([p("A", null), p("B", null)])).toEqual([]);
  });

  it("counts distinct champions (beautiful chaos)", () => {
    const facts = computeFunFacts([p("A", "ARG"), p("B", "BRA"), p("C", "FRA")]);
    const f = facts.find((x) => x.id === "champ-diversity");
    expect(f).toBeTruthy();
    expect(f!.dataSays).toContain("3 different teams");
  });

  it("flags a lone believer", () => {
    const facts = computeFunFacts([p("Sofia", "ARG"), p("Mateo", "ARG"), p("Lucia", "ECU")]);
    const f = facts.find((x) => x.id === "lone-ECU");
    expect(f).toBeTruthy();
    expect(f!.whatsapp).toContain("Lucia");
    expect(f!.whatsapp.toLowerCase()).toContain("only");
  });

  it("calls out a favorite nobody picked (total silence)", () => {
    // ARG is a Pot 1 favorite; pick everyone else so ARG has zero believers.
    const facts = computeFunFacts([p("A", "BRA"), p("B", "BRA"), p("C", "FRA")]);
    // The detector surfaces the first couple of unpicked Pot 1 favorites
    // (USA/MEX are hosts and Pot 1), so silence should fire for a top seed.
    const silence = facts.filter((x) => x.id.startsWith("silence-"));
    expect(silence.length).toBeGreaterThan(0);
    expect(silence.some((f) => f.id === "silence-USA")).toBe(true);
  });

  it("spots an underdog out-believing a favorite", () => {
    // ECU (pot 2/3) gets 3 believers; FRA (pot 1) gets 1.
    const facts = computeFunFacts([
      p("A", "ECU"),
      p("B", "ECU"),
      p("C", "ECU"),
      p("D", "FRA"),
    ]);
    const f = facts.find((x) => x.id.startsWith("underdog-ECU-"));
    expect(f).toBeTruthy();
    expect(f!.whatsapp).toContain("more believers");
  });

  it("detects a city fully committed", () => {
    const facts = computeFunFacts([
      p("A", "MEX", { city: "Miami" }),
      p("B", "MEX", { city: "Miami" }),
      p("C", "MEX", { city: "Miami" }),
    ]);
    const f = facts.find((x) => x.id === "city-allin-Miami");
    expect(f).toBeTruthy();
    expect(f!.whatsapp).toContain("Miami");
  });

  it("detects suspiciously similar brackets", () => {
    const ff = ["ARG", "BRA", "FRA", "ESP"];
    const facts = computeFunFacts([
      p("Ana", "ARG", { ff }),
      p("Bea", "ARG", { ff }),
      p("Cid", "MEX", { ff: ["MEX", "USA", "CAN", "JPN"] }),
    ]);
    const f = facts.find((x) => x.id === "twins");
    expect(f).toBeTruthy();
    expect(f!.whatsapp).toMatch(/Ana|Bea/);
  });

  it("detects heart-pickers (champion === rooting)", () => {
    const facts = computeFunFacts([
      p("A", "MEX", { rooting: "MEX" }),
      p("B", "MEX", { rooting: "MEX" }),
    ]);
    const f = facts.find((x) => x.id === "heart-MEX");
    expect(f).toBeTruthy();
    expect(f!.whatsapp.toLowerCase()).toContain("heart");
  });

  it("every fact carries all four fields + a whatsapp line", () => {
    const facts = computeFunFacts([
      p("A", "ARG", { ff: ["ARG", "BRA", "FRA", "ESP"], city: "Miami", rooting: "ARG" }),
      p("B", "ECU", { ff: ["ECU", "USA", "MEX", "CAN"], city: "Miami" }),
      p("C", "ECU", { city: "Austin" }),
    ]);
    expect(facts.length).toBeGreaterThan(0);
    for (const f of facts) {
      expect(f.id).toBeTruthy();
      expect(f.title).toBeTruthy();
      expect(f.dataSays).toBeTruthy();
      expect(f.why).toBeTruthy();
      expect(f.whatsapp.length).toBeGreaterThan(0);
    }
    // ids are unique
    expect(new Set(ids(facts)).size).toBe(facts.length);
  });
});
