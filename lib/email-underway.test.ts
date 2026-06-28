import { describe, expect, it } from "vitest";
import {
  renderTournamentUnderway,
  tournamentUnderwaySubject,
  type UnderwayParams,
} from "./email-template";

const base: UnderwayParams = {
  firstName: "Pilar",
  rank: 19,
  total: 42,
  championName: "Argentina",
  championOut: false,
  championAlive: true,
  hasPoints: true,
  nextOpenMatchLabel: "Brazil vs Japan",
  nextOpenKickoffLabel: "Sunday 1:00 PM ET",
  caughtUpOnScores: false,
  scoreUrl: "https://wc26.example/picks/score?me=tok",
  liveUrl: "https://wc26.example/picks/live?token=tok",
  referralCount: 0,
  playUrl: "https://wc26.example",
  chatUrl: "[ADD CHAT LINK HERE]",
};

describe("tournamentUnderwaySubject — precedence", () => {
  it("champion out comes first", () => {
    expect(tournamentUnderwaySubject({ ...base, championOut: true, championAlive: false })).toMatch(
      /your champion is out/,
    );
  });
  it("zero points beats champion-alive", () => {
    expect(tournamentUnderwaySubject({ ...base, hasPoints: false })).toMatch(/it's still early/);
  });
  it("champion alive with points", () => {
    expect(tournamentUnderwaySubject(base)).toMatch(/your champion is still alive/);
  });
  it("has points but champion unknown → on the board", () => {
    expect(tournamentUnderwaySubject({ ...base, championAlive: false })).toMatch(/already on the board/);
  });
});

describe("renderTournamentUnderway — variants", () => {
  it("score CTA + champion-alive copy when there's an open unsubmitted match", () => {
    const html = renderTournamentUnderway(base);
    expect(html).toContain("Predict the score");
    expect(html).toContain("Brazil vs Japan");
    expect(html).toContain(base.scoreUrl);
    expect(html).toContain("Argentina is still in it");
  });
  it("live CTA when caught up on scores", () => {
    const html = renderTournamentUnderway({ ...base, nextOpenMatchLabel: null, caughtUpOnScores: true });
    expect(html).toContain("Pick who advances");
    expect(html).toContain(base.liveUrl);
    expect(html).not.toContain("Predict the score →");
  });
  it("champion-out and zero-point copy", () => {
    expect(renderTournamentUnderway({ ...base, championOut: true, championAlive: false })).toContain(
      "is out — but you're far from done",
    );
    expect(renderTournamentUnderway({ ...base, hasPoints: false, total: 0 })).toContain("No points yet");
  });
  it("referral recognition only for referrers", () => {
    expect(renderTournamentUnderway({ ...base, referralCount: 3 })).toContain("You brought 3 to La Copa");
    expect(renderTournamentUnderway({ ...base, referralCount: 0 })).toContain(
      "Bringing the Familia (referrals) is closed",
    );
  });
  it("never claims a champion status when unsure (neutral copy)", () => {
    const html = renderTournamentUnderway({ ...base, championAlive: false, championOut: false });
    expect(html).toContain("up for grabs");
    expect(html).not.toContain("is still in it");
    expect(html).not.toContain("is out —");
  });
});
