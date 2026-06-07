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
        title: "the game is open",
        body: "ok La Copa de LaFamilia is live. takes like 3 minutes to make your picks. who's first 👀",
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
      title: "current leader",
      body:
        leader.total > 0
          ? `wait, ${leader.name} is in first with ${leader.total} pts. ok who's going to do something about that 👀`
          : `everyone's locked in and tied at zero. for now we all believe we're winning this 😌`,
    });
  }

  const insights = computeInsights(participants);

  // How split is the room on champion?
  const distinctChamps = new Set(
    participants.map((p) => p.predictions.champion).filter(Boolean),
  ).size;
  if (distinctChamps >= 4) {
    updates.push({
      type: "champions-spread",
      title: "nobody agrees",
      body: `we have ${distinctChamps} different champions picked so far 😭 not one of us can agree on who wins it.`,
    });
  }

  // Community favorite for champion
  const champ = insights.find((i) => i.id === "champion")?.bars[0];
  if (champ && champ.key !== "__other") {
    updates.push({
      type: "favorite",
      title: "the popular pick",
      body: `${teamFlag(champ.key)} ${teamName(champ.key)} is who most of us picked to win it all (${champ.pct}%). curious if that's real belief or just playing it safe 🤔`,
    });
  }

  // Who Familia is rooting for
  const rooting = insights.find((i) => i.id === "rooting")?.bars[0];
  if (rooting && rooting.key !== "__other") {
    updates.push({
      type: "rooting",
      title: "who we're cheering for",
      body: `${teamFlag(rooting.key)} ${teamName(rooting.key)} is the country Familia is rooting for the most (${rooting.pct}%). hometown loyalty stays undefeated.`,
    });
  }

  // The group nobody can agree on
  const contested = insights.find((i) => i.id === "contested");
  const letter = contested?.title.split("Group ")[1];
  const top = contested?.bars[0];
  if (contested && letter && top) {
    updates.push({
      type: "contested",
      title: `group ${letter} is a mess`,
      body: `nobody can agree on who wins Group ${letter}. even the favorite, ${teamFlag(top.key)} ${teamName(top.key)}, is only at ${top.pct}%. we kind of need a poll.`,
    });
  }

  // Participation
  updates.push({
    type: "participation",
    title: "who's still missing",
    body: `${participants.length} of us have made our picks. ok now tag whoever's been saying "later" all week 👀`,
  });

  return updates;
}
