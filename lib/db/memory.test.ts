import { promises as fs } from "node:fs";
import path from "node:path";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { memoryRepo } from "./memory";

// getScorePredictionTotals is what feeds the bonus slice into recomputeScores →
// the main leaderboard total. The key guarantee: an unscored match (points
// still null) must contribute nothing and never poison a player's total. If the
// null-skip ever regressed, `0 + null` would yield NaN and break the board.
//
// The memory store persists to .data/dev.json (the local dev data), so snapshot
// and restore it around these tests rather than clobbering it.

const DATA_FILE = path.join(process.cwd(), ".data", "dev.json");

async function readFileOrNull(p: string): Promise<string | null> {
  try {
    return await fs.readFile(p, "utf8");
  } catch {
    return null;
  }
}

let snapshot: string | null = null;

beforeAll(async () => {
  snapshot = await readFileOrNull(DATA_FILE);
});

afterAll(async () => {
  if (snapshot != null) await fs.writeFile(DATA_FILE, snapshot, "utf8");
  else await fs.rm(DATA_FILE, { force: true });
});

beforeEach(async () => {
  // Fresh empty store for each test (load() returns EMPTY_SHAPE when absent).
  await fs.rm(DATA_FILE, { force: true });
});

describe("memoryRepo.getScorePredictionTotals", () => {
  it("sums only scored predictions and ignores unscored matches (no NaN)", async () => {
    // Player A: a Mexico exact score + a second match's correct-result point.
    await memoryRepo.upsertScorePrediction({ participantId: "A", matchId: "MEX_RSA", scoreA: 2, scoreB: 1 });
    await memoryRepo.upsertScorePrediction({ participantId: "A", matchId: "USA_PAR", scoreA: 1, scoreB: 0 });
    // Player B: a prediction on a match that hasn't been scored yet.
    await memoryRepo.upsertScorePrediction({ participantId: "B", matchId: "BRA_MAR", scoreA: 3, scoreB: 0 });

    // Score only the first two matches; BRA_MAR stays unscored (points null).
    await memoryRepo.scoreMatch("MEX_RSA", 2, 1, "api"); // A exact → +3
    await memoryRepo.scoreMatch("USA_PAR", 3, 1, "admin"); // A predicted home win, correct result → +1

    const totals = await memoryRepo.getScorePredictionTotals();

    expect(totals.A).toBe(4); // 3 + 1, both bonus points reach the total
    expect(Number.isNaN(totals.A)).toBe(false);
    // B's only match is unscored → not summed at all (absent, not NaN/0-poisoned).
    expect(totals.B ?? 0).toBe(0);
    expect("B" in totals).toBe(false);
  });

  it("a player with only an unscored prediction never appears in the totals", async () => {
    await memoryRepo.upsertScorePrediction({ participantId: "C", matchId: "ESP_CPV", scoreA: 2, scoreB: 0 });
    const totals = await memoryRepo.getScorePredictionTotals();
    expect(Object.keys(totals)).toHaveLength(0);
  });

  it("scoreMatch is idempotent and resetMatchScoring undoes only that match", async () => {
    await memoryRepo.upsertScorePrediction({ participantId: "A", matchId: "MEX_RSA", scoreA: 2, scoreB: 0 });
    await memoryRepo.upsertScorePrediction({ participantId: "A", matchId: "ESP_CPV", scoreA: 1, scoreB: 1 });

    await memoryRepo.scoreMatch("MEX_RSA", 2, 0, "api"); // exact → +3
    await memoryRepo.scoreMatch("ESP_CPV", 1, 1, "admin"); // exact draw → +3
    expect((await memoryRepo.getScorePredictionTotals()).A).toBe(6);

    // Re-running awards nothing new (no double counting).
    const again = await memoryRepo.scoreMatch("MEX_RSA", 2, 0, "api");
    expect(again.scored).toBe(0);
    expect((await memoryRepo.getScorePredictionTotals()).A).toBe(6);

    // Reset only MEX_RSA → its 3 points drop, ESP_CPV untouched.
    const { reset } = await memoryRepo.resetMatchScoring("MEX_RSA");
    expect(reset).toBe(1);
    expect((await memoryRepo.getScorePredictionTotals()).A).toBe(3);

    // A corrected score can then be re-applied cleanly.
    await memoryRepo.scoreMatch("MEX_RSA", 1, 0, "admin"); // now only correct-result → +1
    expect((await memoryRepo.getScorePredictionTotals()).A).toBe(4);
  });

  it("getScorePredictionCounts counts predictions per match", async () => {
    await memoryRepo.upsertScorePrediction({ participantId: "A", matchId: "MEX_RSA", scoreA: 1, scoreB: 0 });
    await memoryRepo.upsertScorePrediction({ participantId: "B", matchId: "MEX_RSA", scoreA: 2, scoreB: 2 });
    await memoryRepo.upsertScorePrediction({ participantId: "A", matchId: "ESP_CPV", scoreA: 3, scoreB: 0 });
    const counts = await memoryRepo.getScorePredictionCounts();
    expect(counts.MEX_RSA).toBe(2);
    expect(counts.ESP_CPV).toBe(1);
  });
});
