import { teamFlag, teamName } from "./teams";
import type { Participant } from "./types";

// Fun Facts — short, human OBSERVATIONS about the Familia's picks, written the
// way someone would react in the WhatsApp after looking at the data for a few
// seconds and noticing something true about people. The smile comes from the
// observation, not from a joke. Pure + deterministic (no Date/random) so the
// same data always yields the same observations.

export type FunFact = {
  id: string;
  category: string;
  /** The full multi-line observation — ready to read or paste as-is. */
  text: string;
};

const tn = (c: string) => teamName(c);
const fl = (c: string) => teamFlag(c);
const first = (p: Participant) => p.name.trim().split(/\s+/)[0] || p.name;

// Teams the outside world (betting markets, media, bracket talk) keeps near the
// top for 2026 — used only to contrast with what the Familia actually picked.
const PUBLIC_FAVORITES = ["FRA", "ARG", "ESP", "ENG", "BRA"];

function championBelievers(ps: Participant[]): Map<string, Participant[]> {
  const m = new Map<string, Participant[]>();
  for (const p of ps) {
    const c = p.predictions.champion;
    if (!c) continue;
    (m.get(c) ?? m.set(c, []).get(c)!).push(p);
  }
  return m;
}

function finalFourCounts(ps: Participant[]): Map<string, number> {
  const m = new Map<string, number>();
  for (const p of ps) for (const c of p.predictions.semifinalists ?? []) m.set(c, (m.get(c) ?? 0) + 1);
  return m;
}

function rootingCounts(ps: Participant[]): Map<string, number> {
  const m = new Map<string, number>();
  for (const p of ps) if (p.rootingCountry) m.set(p.rootingCountry, (m.get(p.rootingCountry) ?? 0) + 1);
  return m;
}

function byCity(ps: Participant[]): Map<string, Participant[]> {
  const m = new Map<string, Participant[]>();
  for (const p of ps) {
    if (!p.city || !p.predictions.champion) continue;
    const key = p.city.trim();
    if (key) (m.get(key) ?? m.set(key, []).get(key)!).push(p);
  }
  return m;
}

/**
 * Build the Familia observations for the current picks. Each one only appears
 * when there's something genuinely worth saying. Ordered most reply-worthy
 * first. Never repeats a team across the team-based observations.
 */
export function computeFunFacts(participants: Participant[]): FunFact[] {
  const ps = participants.filter((p) => p.predictions.champion);
  const out: FunFact[] = [];
  if (ps.length === 0) return out;

  const total = ps.length;
  const champ = championBelievers(ps);
  const ff = finalFourCounts(ps);
  const champEntries = [...champ.entries()].sort(
    (a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0]),
  );
  const used = new Set<string>(); // teams already used in a team-based observation

  // 1) Heart vs brain — most-rooted-for team that few actually picked to win.
  const roots = [...rootingCounts(ps).entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  if (roots.length && roots[0][1] >= 3) {
    const [rc, rn] = roots[0];
    const heart = ps.filter((p) => p.rootingCountry === rc && p.predictions.champion === rc).length;
    if (heart * 2 < rn) {
      out.push({
        id: "heart-brain",
        category: "Heart vs Brain",
        text: `${fl(rc)} ${tn(rc)} is who most of us are rooting for ❤️\n\nBut only ${heart} of us actually picked them to win.\n\nOur hearts and our brackets aren't having the same conversation.`,
      });
      used.add(rc);
    }
  }

  // 2) Believers, not champions — a team people put deep but won't crown.
  const believe = [...ff.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .find(([code, n]) => n >= 4 && (champ.get(code)?.length ?? 0) <= 1 && !used.has(code));
  if (believe) {
    const [code, n] = believe;
    const cn = champ.get(code)?.length ?? 0;
    out.push({
      id: "believers",
      category: "Unexpected Truths",
      text: `${n} of us have ${fl(code)} ${tn(code)} in our Final Four.\n\n${cn === 0 ? "Zero" : String(cn)} of us picked them to win it.\n\nWe believe in them. Just… not all the way.`,
    });
    used.add(code);
  }

  // 3) The front-runner — with a turn.
  if (champEntries.length && champEntries[0][1].length >= 3 && !used.has(champEntries[0][0])) {
    const [code, list] = champEntries[0];
    out.push({
      id: "front-runner",
      category: "Community Personality",
      text: `${fl(code)} ${tn(code)} is the most-picked champion. ${list.length} of us.\n\nEither everyone did their homework…\n\nor everyone asked the same friend 😅`,
    });
    used.add(code);
  }

  // 4) Public narrative vs Familia — a consensus favorite we're cold on.
  const coldFav = PUBLIC_FAVORITES.filter((c) => !used.has(c))
    .map((c) => ({ c, n: champ.get(c)?.length ?? 0 }))
    .filter((x) => x.n <= Math.max(1, Math.floor(total * 0.05)))
    .sort((a, b) => a.n - b.n || a.c.localeCompare(b.c))[0];
  if (coldFav) {
    out.push({
      id: "public-vs-familia",
      category: "Public vs Familia",
      text: `Everyone outside keeps bringing up ${fl(coldFav.c)} ${tn(coldFav.c)}.\n\n${coldFav.n === 0 ? "Not one of us" : `Only ${coldFav.n} of us`} picked them to win.\n\nEither we see something they don't, or we're about to find out 😅`,
    });
    used.add(coldFav.c);
  }

  // 5) Contrarian — a champion only one person backs.
  const lone = champEntries.find(([code, list]) => list.length === 1 && !used.has(code));
  if (lone) {
    const [code, [p]] = lone;
    out.push({
      id: `contrarian-${code}`,
      category: "Contrarians",
      text: `${first(p)} is the only one who picked ${fl(code)} ${tn(code)} to win.\n\nEveryone else looked at the same teams and went somewhere else.\n\nBold. We'll be watching.`,
    });
    used.add(code);
  }

  // 6) City personalities — the most-unanimous vs the most-split chapter.
  const cities = [...byCity(ps).entries()]
    .filter(([, m]) => m.length >= 3)
    .map(([city, members]) => {
      const distinct = new Set(members.map((m) => m.predictions.champion)).size;
      return { city, n: members.length, distinct, champ: members[0].predictions.champion! };
    });
  const unanimous = cities.filter((c) => c.distinct === 1).sort((a, b) => b.n - a.n)[0];
  const split = cities.filter((c) => c.distinct === c.n).sort((a, b) => b.n - a.n)[0];
  if (unanimous && split && unanimous.city !== split.city) {
    out.push({
      id: "city-rivalry",
      category: "City Rivalries",
      text: `Everyone in ${unanimous.city} picked ${fl(unanimous.champ)} ${tn(unanimous.champ)} to win.\n\n${split.city}? ${split.n} people, ${split.distinct} different champions.\n\nSame Familia, completely different approach.`,
    });
  } else if (unanimous) {
    out.push({
      id: `city-${unanimous.city}`,
      category: "City Rivalries",
      text: `Everyone from ${unanimous.city} picked ${fl(unanimous.champ)} ${tn(unanimous.champ)} to win.\n\nFeels like ${unanimous.city} talked it over first.`,
    });
  } else if (split) {
    out.push({
      id: `city-${split.city}`,
      category: "City Rivalries",
      text: `${split.n} people from ${split.city}. ${split.distinct} different champions.\n\nNobody in ${split.city} is copying anybody's bracket.`,
    });
  }

  // 7) Friend dynamics — two almost-identical brackets.
  outer: for (let i = 0; i < ps.length; i++) {
    for (let j = i + 1; j < ps.length; j++) {
      const a = ps[i];
      const b = ps[j];
      if (a.predictions.champion !== b.predictions.champion) continue;
      const af = new Set(a.predictions.semifinalists ?? []);
      const shared = (b.predictions.semifinalists ?? []).filter((c) => af.has(c)).length;
      if (af.size >= 3 && shared >= 3) {
        out.push({
          id: "twins",
          category: "Friend Dynamics",
          text: `${first(a)} and ${first(b)} have almost the same bracket.\n\nSame champion, ${shared} of the same Final Four.\n\nNot accusing anyone of anything. Just noticing 👀`,
        });
        break outer;
      }
    }
  }

  // 8) Community personality — how many different champions we landed on.
  if (champ.size >= 4) {
    out.push({
      id: "spread",
      category: "Community Personality",
      text: `${champ.size} different teams got picked to win it all.\n\nFor ${total} of us, that's a lot of different opinions.\n\nNobody here is just following the room.`,
    });
  }

  // Guarantee at least one observation whenever people have picked.
  if (out.length === 0 && champEntries.length) {
    const [code, list] = champEntries[0];
    out.push({
      id: "front-runner",
      category: "Community Personality",
      text: `Right now ${fl(code)} ${tn(code)} is the most-picked champion (${list.length} of ${total}).\n\nStill early. Let's see who's reading it right.`,
    });
  }

  return out;
}
