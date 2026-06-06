import { TEAM_BY_CODE, teamFlag, teamName } from "./teams";
import type { Participant } from "./types";

// Fun Facts — casual, group-chat-style observations mined from the prediction
// data. NOT awards, NOT analytics: the voice is "a friend reacting in the
// WhatsApp," warm and a little chaotic. Admin-only; players never see these.
// Pure + deterministic (no Date/random) so the same data always yields the same
// facts, and the admin page recomputes them live whenever picks change.

export type FunFact = {
  id: string;
  emoji: string;
  /** Short scannable title. */
  title: string;
  /** The plain fact behind it. */
  dataSays: string;
  /** Why it's worth posting. */
  why: string;
  /** Ready to paste into WhatsApp. */
  whatsapp: string;
};

const tn = (c: string) => teamName(c);
const fl = (c: string) => teamFlag(c);
const pot = (c: string) => TEAM_BY_CODE[c]?.fifaSeed ?? 4;
const first = (p: Participant) => p.name.trim().split(/\s+/)[0] || p.name;

function championBelievers(ps: Participant[]): Map<string, Participant[]> {
  const m = new Map<string, Participant[]>();
  for (const p of ps) {
    const c = p.predictions.champion;
    if (!c) continue;
    const list = m.get(c);
    if (list) list.push(p);
    else m.set(c, [p]);
  }
  return m;
}

function finalFourCounts(ps: Participant[]): Map<string, number> {
  const m = new Map<string, number>();
  for (const p of ps) {
    for (const c of p.predictions.semifinalists ?? []) m.set(c, (m.get(c) ?? 0) + 1);
  }
  return m;
}

/** Group participants (who have a champion pick) by their city/chapter. */
function byCity(ps: Participant[]): Map<string, Participant[]> {
  const m = new Map<string, Participant[]>();
  for (const p of ps) {
    if (!p.city || !p.predictions.champion) continue;
    const key = p.city.trim();
    if (!key) continue;
    const list = m.get(key);
    if (list) list.push(p);
    else m.set(key, [p]);
  }
  return m;
}

const ffKey = (p: Participant) =>
  [...(p.predictions.semifinalists ?? [])].sort().join("+");

/**
 * Build the casual Fun Facts for the current prediction data, ordered most-
 * shareable first. Each detector is defensive — it simply contributes nothing
 * when the pattern isn't present yet.
 */
export function computeFunFacts(participants: Participant[]): FunFact[] {
  const ps = participants.filter((p) => p.predictions.champion);
  const facts: FunFact[] = [];
  if (ps.length === 0) return facts;

  const champ = championBelievers(ps);
  const ff = finalFourCounts(ps);
  const champEntries = [...champ.entries()].sort((a, b) => b[1].length - a[1].length);

  // 1) How many different champions — beautiful chaos.
  if (champ.size >= 2) {
    facts.push({
      id: "champ-diversity",
      emoji: "🤯",
      title: "Beautiful chaos",
      dataSays: `${champ.size} different teams have been picked to win it all (out of ${ps.length} brackets).`,
      why: "A wide spread means lots of disagreement to stir up.",
      whatsapp: `we've got ${champ.size} different champions picked so far 🤯 beautiful chaos. who's right??`,
    });
  }

  // 2) Lone believers — a champion only one person backs.
  const lone = champEntries.filter(([, list]) => list.length === 1).slice(0, 2);
  for (const [code, [p]] of lone) {
    facts.push({
      id: `lone-${code}`,
      emoji: "🧐",
      title: "Lone believer",
      dataSays: `${first(p)} is the only person who picked ${tn(code)} to win it all.`,
      why: "A true solo call — nobody else is with them.",
      whatsapp: `${first(p)} is the ONLY one who picked ${fl(code)} ${tn(code)} to win it all 😭 i need to hear the reasoning.`,
    });
  }

  // 3) Total silence — a tournament favorite (Pot 1) nobody believes in.
  const ignoredFavorites = Object.values(TEAM_BY_CODE)
    .filter((t) => t.qualified && t.fifaSeed === 1 && !(champ.get(t.code)?.length))
    .slice(0, 2);
  for (const t of ignoredFavorites) {
    facts.push({
      id: `silence-${t.code}`,
      emoji: "💀",
      title: "Total silence",
      dataSays: `Not one person picked ${t.name} as champion — and they're a top seed.`,
      why: "Zero believers in a favorite is a loud statement.",
      whatsapp: `not ONE person picked ${fl(t.code)} ${t.name} to win 💀 the disrespect is loud.`,
    });
  }

  // 4) Underdog over a favorite — a non-favorite (not a Pot 1 team) with more
  // believers than an actual Pot 1 favorite.
  const topUnderdog = champEntries.find(([code]) => pot(code) >= 2);
  if (topUnderdog) {
    const [uCode, uList] = topUnderdog;
    const beatenFav = champEntries.find(
      ([code, list]) => pot(code) === 1 && list.length < uList.length,
    );
    if (beatenFav) {
      const [fCode, fList] = beatenFav;
      facts.push({
        id: `underdog-${uCode}-${fCode}`,
        emoji: "🤨",
        title: "Wait, what",
        dataSays: `${tn(uCode)} has ${uList.length} champion picks; ${tn(fCode)} (a favorite) only has ${fList.length}.`,
        why: "An underdog out-believing a favorite is peak chaos.",
        whatsapp: `somehow ${fl(uCode)} ${tn(uCode)} has more believers than ${fl(fCode)} ${tn(fCode)} 🤨 explain yourselves.`,
      });
    }
  }

  // 5) A city fully committed to one champion.
  for (const [city, members] of byCity(ps)) {
    if (members.length < 3) continue;
    const counts = new Map<string, number>();
    for (const p of members) {
      const c = p.predictions.champion!;
      counts.set(c, (counts.get(c) ?? 0) + 1);
    }
    const [topCode, topN] = [...counts.entries()].sort((a, b) => b[1] - a[1])[0];
    if (topN === members.length) {
      facts.push({
        id: `city-allin-${city}`,
        emoji: "🤝",
        title: `${city} is locked in`,
        dataSays: `All ${members.length} brackets from ${city} picked ${tn(topCode)} to win.`,
        why: "A whole chapter with zero disagreement is rare.",
        whatsapp: `${city} is FULLY committed to ${fl(topCode)} ${tn(topCode)} 🤝 no hesitation, no notes.`,
      });
    } else if (counts.size === 1) {
      // (covered above)
    } else if (counts.size >= Math.max(3, members.length - 1)) {
      facts.push({
        id: `city-chaos-${city}`,
        emoji: "🌀",
        title: `${city} chose chaos`,
        dataSays: `${members.length} brackets from ${city}, ${counts.size} different champions between them.`,
        why: "Maximum disagreement inside one chapter.",
        whatsapp: `${city} woke up and chose chaos 🌀 ${counts.size} different champions from ${members.length} people.`,
      });
    }
  }

  // 6) Twin brackets — same champion + 3+ shared Final Four teams.
  outer: for (let i = 0; i < ps.length; i++) {
    for (let j = i + 1; j < ps.length; j++) {
      const a = ps[i];
      const b = ps[j];
      if (a.predictions.champion !== b.predictions.champion) continue;
      const af = new Set(a.predictions.semifinalists ?? []);
      const shared = (b.predictions.semifinalists ?? []).filter((c) => af.has(c)).length;
      if (af.size >= 3 && shared >= 3) {
        facts.push({
          id: "twins",
          emoji: "👀",
          title: "Suspiciously similar",
          dataSays: `${first(a)} and ${first(b)} share the same champion and ${shared} of 4 Final Four teams.`,
          why: "Near-identical brackets always get a reaction.",
          whatsapp: `${first(a)} and ${first(b)} have basically the same bracket 👀 suspicious. did y'all collude??`,
        });
        break outer;
      }
    }
  }

  // 7) A team loved by its own — believers who are also rooting for it.
  let heartBest: { code: string; n: number } | null = null;
  for (const [code, list] of champ) {
    const hearts = list.filter((p) => p.rootingCountry === code).length;
    if (hearts >= 2 && (!heartBest || hearts > heartBest.n)) heartBest = { code, n: hearts };
  }
  if (heartBest) {
    facts.push({
      id: `heart-${heartBest.code}`,
      emoji: "❤️",
      title: "Picking with the heart",
      dataSays: `${heartBest.n} people picked ${tn(heartBest.code)} to win — and they're also rooting for them.`,
      why: "Heart over head, every time.",
      whatsapp: `${fl(heartBest.code)} ${tn(heartBest.code)} is getting a lot of love from people who are 100% picking with their heart ❤️ (we see you).`,
    });
  }

  // 8) A one-of-a-kind Final Four.
  const ffGroups = new Map<string, Participant[]>();
  for (const p of ps) {
    if ((p.predictions.semifinalists ?? []).length < 4) continue;
    const k = ffKey(p);
    const list = ffGroups.get(k);
    if (list) list.push(p);
    else ffGroups.set(k, [p]);
  }
  const uniqueFF = [...ffGroups.values()].find((g) => g.length === 1);
  if (uniqueFF) {
    const p = uniqueFF[0];
    facts.push({
      id: "unique-ff",
      emoji: "😅",
      title: "A Final Four of one",
      dataSays: `${first(p)}'s Final Four (${(p.predictions.semifinalists ?? []).map(fl).join(" ")}) is not shared by anyone else.`,
      why: "Totally original — bold or doomed.",
      whatsapp: `${first(p)} picked a Final Four that literally nobody else has 😅 either genius or chaos.`,
    });
  }

  // 9) Split on a team — lots see a deep run, almost nobody sees a title.
  const splitCandidate = [...ff.entries()]
    .filter(([code, n]) => n >= 3 && (champ.get(code)?.length ?? 0) <= 1)
    .sort((a, b) => b[1] - a[1])[0];
  if (splitCandidate) {
    const [code, n] = splitCandidate;
    facts.push({
      id: `split-${code}`,
      emoji: "🤷",
      title: "The community can't agree",
      dataSays: `${n} people have ${tn(code)} in their Final Four, but ${champ.get(code)?.length ?? 0} picked them to win it.`,
      why: "Believers and skeptics in the same breath.",
      whatsapp: `the community is split on ${fl(code)} ${tn(code)} — plenty see a deep run, almost nobody sees them lifting the trophy 🤷`,
    });
  }

  // 10) Quiet fans — a team with exactly two champion believers.
  const quiet = champEntries.find(([, list]) => list.length === 2);
  if (quiet) {
    const [code] = quiet;
    facts.push({
      id: `quiet-${code}`,
      emoji: "🤫",
      title: "Quiet, but there",
      dataSays: `Exactly 2 people picked ${tn(code)} to win.`,
      why: "A tiny, loyal corner worth a shout-out.",
      whatsapp: `${fl(code)} ${tn(code)} fans are quiet… but they exist (there's 2 of you 🤫).`,
    });
  }

  return facts;
}
