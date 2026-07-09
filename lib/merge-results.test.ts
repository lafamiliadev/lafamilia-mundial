import { describe, expect, it } from "vitest";
import { mergeResults } from "./merge-results";
import { EMPTY_RESULTS, type Results } from "./types";

function results(partial: Partial<Results>): Results {
  return { ...EMPTY_RESULTS, groupWinners: {}, stageReached: {}, matchWinners: {}, ...partial };
}

describe("mergeResults", () => {
  it("unions stageReached per stage instead of letting stored freeze the list", () => {
    // The regression: stored held the FIRST pair ever saved for a stage, and a
    // key-level override made it beat the provider's fuller list forever.
    const stored = results({ stageReached: { qf: ["FRA", "MAR"] } });
    const provider = results({
      stageReached: { qf: ["FRA", "MAR", "NOR", "ENG", "ESP", "BEL", "ARG", "SUI"] },
    });
    const merged = mergeResults(provider, stored);
    expect(merged.stageReached.qf).toHaveLength(8);
    expect(merged.stageReached.qf).toEqual(
      expect.arrayContaining(["FRA", "MAR", "NOR", "ENG", "ESP", "BEL", "ARG", "SUI"]),
    );
  });

  it("keeps stored stage entries when the provider comes back empty (API down)", () => {
    const stored = results({ stageReached: { r16: ["CAN", "MAR"], qf: ["FRA"] } });
    const merged = mergeResults(results({}), stored);
    expect(merged.stageReached).toEqual({ r16: ["CAN", "MAR"], qf: ["FRA"] });
  });

  it("keeps admin back-filled teams the provider doesn't know, without duplicates", () => {
    const stored = results({ stageReached: { qf: ["SUI", "FRA"] } });
    const provider = results({ stageReached: { qf: ["FRA", "MAR"] } });
    const merged = mergeResults(provider, stored);
    expect(merged.stageReached.qf?.sort()).toEqual(["FRA", "MAR", "SUI"]);
  });

  it("lets stored (admin) win per-field for scalars and per-key for maps", () => {
    const stored = results({
      champion: "ARG",
      groupWinners: { A: "MEX" },
      matchWinners: { "af-1": "BEL" },
    });
    const provider = results({
      champion: "FRA",
      goldenBoot: "player-9",
      groupWinners: { A: "RSA", B: "SUI" },
      matchWinners: { "af-1": "USA", "af-2": "ARG" },
    });
    const merged = mergeResults(provider, stored);
    expect(merged.champion).toBe("ARG");
    expect(merged.goldenBoot).toBe("player-9");
    expect(merged.groupWinners).toEqual({ A: "MEX", B: "SUI" });
    expect(merged.matchWinners).toEqual({ "af-1": "BEL", "af-2": "ARG" });
  });
});
