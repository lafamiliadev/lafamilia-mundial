import "server-only";
import { db } from "./db";
import { computeInsights } from "./insights";
import { teamFlag, teamName } from "./teams";

export type GeneratedUpdate = { type: string; title: string; body: string };

/**
 * Auto-generates WhatsApp-ready community updates from the current state.
 * Pure formatting over live data — exportable strings the admin can paste
 * straight into WhatsApp, a newsletter, or social.
 */
export async function generateCommunityUpdates(): Promise<GeneratedUpdate[]> {
  const repo = await db();
  const participants = await repo.listParticipants();
  const scores = await repo.getScores();
  const updates: GeneratedUpdate[] = [];

  if (participants.length === 0) {
    return [
      {
        type: "kickoff",
        title: "🌎 Predictions are open!",
        body: "La Copa de LaFamilia 2026 is live. Make your picks in under 2 minutes and claim your spot on the leaderboard. ⚽",
      },
    ];
  }

  // Leader
  const ranked = participants
    .map((p) => ({ name: p.name, total: scores[p.id]?.total ?? 0 }))
    .sort((a, b) => b.total - a.total);
  const leader = ranked[0];
  if (leader) {
    updates.push({
      type: "leader",
      title: "🏆 New Leader",
      body:
        leader.total > 0
          ? `${leader.name} moves into first place with ${leader.total} points. Who's coming for the crown? 👑`
          : `${ranked.length} predictors are locked in and level on points — the race begins at kickoff. 🏁`,
    });
  }

  // Community favorite + dark horse + latam from insights
  const insights = computeInsights(participants);
  const champ = insights.find((i) => i.id === "champion")?.bars[0];
  if (champ) {
    updates.push({
      type: "favorite",
      title: "🌎 Community Favorite",
      body: `${teamFlag(champ.key)} ${teamName(champ.key)} is Familia's most-predicted champion — ${champ.pct}% of us are betting on them to lift the trophy.`,
    });
  }
  const dark = insights.find((i) => i.id === "darkhorse")?.bars[0];
  if (dark) {
    updates.push({
      type: "darkhorse",
      title: "🔥 Dark Horse Watch",
      body: `${teamFlag(dark.key)} ${teamName(dark.key)} is the Familia's favourite surprise pick (${dark.pct}%). Bold call — will it pay off?`,
    });
  }
  const latam = insights.find((i) => i.id === "latam")?.bars[0];
  if (latam) {
    updates.push({
      type: "latam",
      title: "🌶️ LatAm Belief",
      body: `${teamFlag(latam.key)} ${teamName(latam.key)} is the Latin American side Familia believes in most to go deep. 🙌`,
    });
  }

  // Participation milestone
  updates.push({
    type: "participation",
    title: "📈 Familia is growing",
    body: `${participants.length} members have made their predictions. Tag a founder who hasn't played yet — the deadline is kickoff. ⏳`,
  });

  return updates;
}
