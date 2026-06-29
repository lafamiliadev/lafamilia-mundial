import { describe, expect, it } from "vitest";
import { summarizeLiveEveryone, type LivePickInput } from "./live-view";

const p = (name: string, team: string, hc = false, slug = name.toLowerCase()): LivePickInput => ({
  name,
  slug,
  rootingCountry: null,
  team,
  highConviction: hc,
});

describe("summarizeLiveEveryone", () => {
  it("counts pickers per side", () => {
    const r = summarizeLiveEveryone([p("A", "MEX"), p("B", "MEX"), p("C", "CAN")], "MEX", "CAN", null, 1);
    expect(r.total).toBe(3);
    expect(r.homeCount).toBe(2);
    expect(r.awayCount).toBe(1);
  });

  it("awards points only once a winner is set, doubling High Conviction", () => {
    const r = summarizeLiveEveryone(
      [p("Win", "MEX"), p("WinHC", "MEX", true), p("Lose", "CAN")],
      "MEX",
      "CAN",
      "MEX",
      2,
    );
    const by = Object.fromEntries(r.rows.map((row) => [row.name, row]));
    expect(by.Win.points).toBe(2);
    expect(by.Win.correct).toBe(true);
    expect(by.WinHC.points).toBe(4); // High Conviction doubles
    expect(by.Lose.points).toBe(0);
    expect(by.Lose.correct).toBe(false);
  });

  it("leaves points null and correct false before the winner is known", () => {
    const r = summarizeLiveEveryone([p("A", "MEX")], "MEX", "CAN", null, 1);
    expect(r.rows[0].points).toBeNull();
    expect(r.rows[0].correct).toBe(false);
    expect(r.winner).toBeNull();
  });

  it("sorts winners first, then High Conviction, then alphabetical", () => {
    const r = summarizeLiveEveryone(
      [p("Zoe", "CAN"), p("Ana", "MEX"), p("Bea", "MEX", true)],
      "MEX",
      "CAN",
      "MEX",
      1,
    );
    // Bea (winner + HC) → Ana (winner) → Zoe (wrong)
    expect(r.rows.map((x) => x.name)).toEqual(["Bea", "Ana", "Zoe"]);
  });

  it("is defensive against empty and unnamed input", () => {
    const r = summarizeLiveEveryone([], "MEX", "CAN", "MEX", 1);
    expect(r.total).toBe(0);
    expect(r.rows).toEqual([]);
    const r2 = summarizeLiveEveryone([p("", "MEX")], "MEX", "CAN", null, 1);
    expect(r2.rows[0].name).toBe("Anónimo");
  });
});
