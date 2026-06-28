// Pure rendering for the emails (no server-only / no secrets), so they can be
// previewed and unit-tested. lib/email.ts handles the actual Resend send.
//
// Voice: write like a real person from the Familia. Active voice, "you/your",
// short. No marketing/corporate/AI filler, minimal emoji, no "journey/unlock/
// don't miss out/thrilled". Numbers, not vibes.

export const SIEMBRA_URL = "https://givebutter.com/siembra-con-lafamilia-foundation";
export const JOIN_URL = "https://nas.io/lafamilia-foundation";

export const NAVY = "#0a2342";
export const GOLD = "#c8a24a";
export const GREEN = "#0b6b3a";
export const PAGE = "#f4f1ea";
export const INK = "#1b2430";
export const MUTED = "#6f6a60";
export const SANS = "-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Helvetica,Arial,sans-serif";

export function emailButton(
  href: string,
  label: string,
  opts: { bg: string; color: string; border?: string },
): string {
  const border = opts.border ? `border:2px solid ${opts.border};` : "border:0;";
  return `<a href="${href}" target="_blank" style="display:block;background:${opts.bg};color:${opts.color};${border}text-decoration:none;font-weight:700;font-size:16px;text-align:center;padding:15px 20px;border-radius:14px;font-family:${SANS};">${label}</a>`;
}

/** The shared chrome: green LaFamilia header, white card, quiet footer. Header
 * is the app's stadium green so the email feels like opening La Copa. */
export function emailShell({ preheader, body }: { preheader: string; body: string }): string {
  return `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="x-apple-disable-message-reformatting"><title>La Copa de LaFamilia 2026</title></head>
<body style="margin:0;padding:0;background:${PAGE};">
<span style="display:none;max-height:0;overflow:hidden;opacity:0;color:${PAGE};">${preheader}</span>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${PAGE};padding:24px 12px;">
<tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 6px 24px rgba(10,35,66,0.08);">
  <tr><td style="background:${GREEN};padding:26px 28px;text-align:center;border-bottom:3px solid ${GOLD};">
    <div style="font-family:${SANS};font-size:26px;font-weight:800;letter-spacing:-0.5px;color:#ffffff;">LaFamilia</div>
    <div style="font-family:${SANS};font-size:12px;font-weight:700;letter-spacing:3px;color:${GOLD};margin-top:6px;">LA COPA DE LAFAMILIA · 2026 ⚽</div>
  </td></tr>
  ${body}
  <tr><td style="padding:24px 28px 30px;font-family:${SANS};text-align:center;">
    <div style="font-size:12px;color:${MUTED};">La Copa de LaFamilia 2026 · A community game, not betting.</div>
  </td></tr>
</table>
</td></tr>
</table>
</body></html>`;
}

/** A standard content block: heading + paragraphs. */
export function emailIntro(opts: { emoji?: string; heading: string; paras: string[] }): string {
  const para = (t: string) =>
    `<p style="margin:12px 0 0;font-size:16px;line-height:1.6;color:${MUTED};">${t}</p>`;
  return `<tr><td style="padding:32px 28px 6px;font-family:${SANS};">
    ${opts.emoji ? `<div style="font-size:34px;">${opts.emoji}</div>` : ""}
    <h1 style="margin:${opts.emoji ? "10px" : "0"} 0 0;font-size:26px;font-weight:800;color:${INK};">${opts.heading}</h1>
    ${opts.paras.map(para).join("")}
  </td></tr>`;
}

/** Primary CTA row. */
function cta(href: string, label: string): string {
  return `<tr><td style="padding:22px 28px 6px;">${emailButton(href, label, { bg: GREEN, color: "#ffffff" })}</td></tr>`;
}

/** A quiet "what's next" line under the action. */
function nextLine(text: string): string {
  return `<tr><td style="padding:10px 28px 6px;font-family:${SANS};"><p style="margin:0;font-size:14px;line-height:1.5;color:${MUTED};text-align:center;">${text}</p></td></tr>`;
}

/** A small standings stat (rank of total). */
function standings(rank: number, total: number): string {
  return `<tr><td style="padding:18px 28px 0;font-family:${SANS};"><div style="background:${PAGE};border-radius:14px;padding:16px 20px;text-align:center;"><span style="font-size:32px;font-weight:900;color:${INK};">#${rank}</span><span style="font-size:15px;color:${MUTED};font-weight:600;"> of ${total} in the Familia</span></div></td></tr>`;
}

export function formatDeadline(iso: string): string {
  try {
    return new Intl.DateTimeFormat("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      timeZone: "America/New_York",
      timeZoneName: "short",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

// ── 1. Confirmation (sent on submit) ─────────────────────────────────
export type ConfirmationParams = {
  to: string;
  firstName: string;
  champion: string;
  editUrl: string;
  bonusUrl: string;
  shareUrl: string;
  deadlineIso: string;
};

export const CONFIRMATION_SUBJECT = "Your picks are in";

export function renderConfirmationEmailHtml(p: ConfirmationParams): string {
  const deadline = formatDeadline(p.deadlineIso);
  const wa = `I just made my La Copa de LaFamilia picks. Can you beat my bracket?\n\n${p.shareUrl}`;
  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(wa)}`;
  const body = `
  ${emailIntro({
    emoji: "🎉",
    heading: `You're in, ${p.firstName}.`,
    paras: [
      `Your bracket's set — ${p.champion} to win it all. You can change anything until <strong style="color:${INK};">${deadline}</strong>. After that, every bracket locks.`,
    ],
  })}
  <tr><td style="padding:22px 28px 0;font-family:${SANS};">
    <div style="border-top:1px solid #eee;padding-top:22px;">
      <h2 style="margin:0;font-size:18px;font-weight:800;color:${INK};">Add your Bonus Picks</h2>
      <p style="margin:8px 0 14px;font-size:15px;line-height:1.55;color:${MUTED};">Four quick picks on top of your bracket: best player, top scorer, best keeper, and a dark horse. Worth up to 44 points.</p>
      ${emailButton(p.bonusUrl, "Add my Bonus Picks", { bg: GREEN, color: "#ffffff" })}
    </div>
  </td></tr>
  <tr><td style="padding:18px 28px 0;font-family:${SANS};">
    <p style="margin:0 0 12px;font-size:15px;line-height:1.55;color:${MUTED};">Then send your card to a few friends and see who can beat it.</p>
    ${emailButton(whatsappUrl, "Share on WhatsApp", { bg: "#ffffff", color: NAVY, border: NAVY })}
  </td></tr>
  <tr><td style="padding:18px 28px 0;font-family:${SANS};">
    <div style="background:${NAVY};border-radius:16px;padding:22px;">
      <h2 style="margin:0;font-size:17px;font-weight:800;color:#ffffff;">Why we play</h2>
      <p style="margin:8px 0 16px;font-size:15px;line-height:1.55;color:#cdd6e6;">La Copa supports <strong style="color:#ffffff;">Siembra</strong>, our campaign to put more Latine founders in the room. When one of us gets in, we open the door for the next. Chip in if you can.</p>
      ${emailButton(SIEMBRA_URL, "Support Siembra", { bg: GOLD, color: "#3a2b00" })}
    </div>
  </td></tr>
  ${nextLine("Your first points land June 27. We'll let you know.")}`;
  return emailShell({ preheader: "You're in. Edit anytime before kickoff, and bring the Familia.", body });
}

// ── 2. Last call (≈24h before kickoff) ───────────────────────────────
export function renderLastCall(p: { firstName: string; picksUrl: string }): string {
  const body = `
  ${emailIntro({
    heading: `Last call, ${p.firstName}.`,
    paras: [
      "Picks lock tomorrow, when the World Cup kicks off. If you meant to tweak your bracket or add your Bonus Picks (worth up to 44 points), now's the time.",
    ],
  })}
  ${cta(p.picksUrl, "Review my picks")}
  ${nextLine("After kickoff, your bracket's set for the tournament.")}`;
  return emailShell({ preheader: "Picks lock tomorrow at kickoff.", body });
}

// ── 3. Locked in (kickoff) ───────────────────────────────────────────
export function renderLockedIn(p: { firstName: string; leaderboardUrl: string }): string {
  const body = `
  ${emailIntro({
    heading: "You're locked in.",
    paras: [
      "The World Cup's underway and every bracket is set, yours included.",
      "You can still earn points right now: predict the final score of LatAm + Spain matches — +3 for the exact score, +1 for the winner. Your bracket's big points land June 27, when the group stage wraps.",
    ],
  })}
  ${cta(p.leaderboardUrl, "See the race")}
  ${nextLine("Predict a score today, or check back June 27 for your bracket points.")}`;
  return emailShell({ preheader: "Brackets are locked — but you can earn points now.", body });
}

// ── 4. First points (group stage ends) ───────────────────────────────
export function renderFirstPoints(p: { firstName: string; rank: number; total: number; leaderboardUrl: string }): string {
  const body = `
  ${emailIntro({
    heading: `You're on the board, ${p.firstName}.`,
    paras: [
      "The group stage is done and your picks just scored. Here's where you landed.",
    ],
  })}
  ${standings(p.rank, p.total)}
  ${cta(p.leaderboardUrl, "See the leaderboard")}
  ${nextLine("Your card keeps scoring through the knockouts — we'll let you know when you move.")}`;
  return emailShell({ preheader: `You're #${p.rank} of ${p.total} in the Familia.`, body });
}

// ── 5. Round opens (each knockout round) ─────────────────────────────
export function renderRoundOpen(p: { round: string; picksUrl: string; locksLabel: string }): string {
  const body = `
  ${emailIntro({
    heading: `${p.round} picks are open.`,
    paras: [
      "Pick who wins each match. Get one right and you score — and you can still climb even if your champion's already out.",
      `Picks lock when the first match starts, ${p.locksLabel}.`,
    ],
  })}
  ${cta(p.picksUrl, `Make my ${p.round} picks`)}
  ${nextLine("Once you're in, sit back and watch the points come in.")}`;
  return emailShell({ preheader: `${p.round} picks are open. Lock them in before kickoff.`, body });
}

// ── 6. Closing soon ──────────────────────────────────────────────────
export function renderClosingSoon(p: { round: string; hours: number; picksUrl: string }): string {
  const body = `
  ${emailIntro({
    heading: "Almost out of time.",
    paras: [
      `${p.round} picks lock in about ${p.hours} hours, when the first match starts. If you haven't made yours, now's the moment.`,
    ],
  })}
  ${cta(p.picksUrl, "Make my picks")}`;
  return emailShell({ preheader: `${p.round} picks lock soon.`, body });
}

// ── 7. Score update (after a round is scored) ────────────────────────
export function renderScoreUpdate(p: { delta: number; rank: number; total: number; rivalLine?: string; nextLabel: string; leaderboardUrl: string }): string {
  const move = p.delta > 0 ? `up ${p.delta}` : p.delta < 0 ? `down ${Math.abs(p.delta)}` : "steady";
  const heading = p.delta > 0 ? `You moved up ${p.delta}.` : p.delta < 0 ? `You slipped ${Math.abs(p.delta)}.` : "New scores are in.";
  const body = `
  ${emailIntro({
    heading,
    paras: [
      `The round's scored. You're now #${p.rank} of ${p.total} in the Familia.${p.rivalLine ? " " + p.rivalLine : ""}`,
    ],
  })}
  ${standings(p.rank, p.total)}
  ${cta(p.leaderboardUrl, "See the board")}
  ${nextLine(p.nextLabel)}`;
  return emailShell({ preheader: `You're ${move} — #${p.rank} of ${p.total}.`, body });
}

// ── 8. Final Four ────────────────────────────────────────────────────
export function renderFinalFour(p: { rank: number; total: number; picksUrl: string }): string {
  const body = `
  ${emailIntro({
    heading: "Four teams left.",
    paras: [
      `Your Final Four picks just scored. You're #${p.rank} of ${p.total} in the Familia. Semifinal picks are open now.`,
    ],
  })}
  ${cta(p.picksUrl, "Make my semifinal picks")}
  ${nextLine("The final's almost here.")}`;
  return emailShell({ preheader: "The Final Four is set. Semifinal picks are open.", body });
}

// ── 9. The final ─────────────────────────────────────────────────────
export function renderTheFinal(p: { firstName: string; picksUrl: string }): string {
  const body = `
  ${emailIntro({
    heading: `It's the final, ${p.firstName}.`,
    paras: [
      "Your last pick of the tournament, and the most points on the table. Make it count.",
    ],
  })}
  ${cta(p.picksUrl, "Pick the final")}
  ${nextLine("The winner's crowned this weekend.")}`;
  return emailShell({ preheader: "One match left. Make your final pick.", body });
}

// ── 10. Winner / wrap ────────────────────────────────────────────────
export function renderWrap(p: { firstName: string; champion: string; rank: number; total: number; isWinner: boolean; standingsUrl: string }): string {
  const heading = p.isWinner ? `You won La Copa, ${p.firstName}.` : `That's a wrap, ${p.firstName}.`;
  const line = p.isWinner
    ? `${p.champion} won it all — and so did you. You finished #1 of ${p.total} in the Familia. The whole Familia sees it.`
    : `${p.champion} won it all. You finished #${p.rank} of ${p.total} in the Familia.`;
  const body = `
  ${emailIntro({
    emoji: p.isWinner ? "🏆" : undefined,
    heading,
    paras: [line, "Thanks for playing with us this tournament. Until the next one."],
  })}
  ${cta(p.standingsUrl, "See the final standings")}`;
  return emailShell({ preheader: p.isWinner ? "You won La Copa de LaFamilia." : `You finished #${p.rank} in the Familia.`, body });
}

// ── 11. Bonus score pick announcement ────────────────────────────────
export const SCORE_PICK_ANNOUNCEMENT_TEMPLATE_ID = "score-picks-announcement-2026-06-11";
export const SCORE_PICK_ANNOUNCEMENT_SUBJECT = "New: predict the score, earn points ⚽️";

export function renderScorePickAnnouncement(p: { appUrl: string }): string {
  const scoreUrl = `${p.appUrl.replace(/\/$/, "")}/picks/score`;
  const body = `
  <tr><td style="padding:32px 28px 6px;font-family:${SANS};">
    <div style="font-size:34px;">⚽</div>
    <h1 style="margin:10px 0 0;font-size:26px;font-weight:800;color:${INK};">Familiaaaa, surprise bonus round ⚽️</h1>
    <p style="margin:12px 0 0;font-size:16px;line-height:1.6;color:${MUTED};">
      Starting today, you can earn extra points by predicting the exact score for select World Cup matches.
    </p>
    <p style="margin:12px 0 0;font-size:16px;line-height:1.6;color:${MUTED};">
      We&rsquo;re keeping it very LaFamilia: LatAm teams + Spain only.
    </p>
  </td></tr>
  <tr><td style="padding:20px 28px 0;font-family:${SANS};">
    <div style="background:${PAGE};border-radius:14px;padding:18px 20px;">
      <p style="margin:0;font-size:15px;font-weight:700;color:${INK};">First up: Mexico vs South Africa</p>
      <p style="margin:6px 0 0;font-size:14px;color:${MUTED};">Kickoff is today at 12:00 p.m. PT / 3:00 p.m. ET</p>
      <p style="margin:14px 0 0;font-size:14px;color:${MUTED};">Lock your score before kickoff:</p>
      <p style="margin:6px 0 0;font-size:15px;font-weight:700;color:${INK};">Mexico __ &mdash; __ South Africa</p>
    </div>
  </td></tr>
  <tr><td style="padding:18px 28px 0;font-family:${SANS};">
    <p style="margin:0;font-size:15px;line-height:1.6;color:${MUTED};">
      Exact score gets you <strong style="color:${INK};">3 bonus points</strong>.<br>
      Correct winner or draw gets you <strong style="color:${INK};">1 bonus point</strong>.
    </p>
    <p style="margin:12px 0 0;font-size:15px;line-height:1.6;color:${MUTED};">
      No soccer expertise required. Honestly, vibes may be just as accurate.
    </p>
  </td></tr>
  <tr><td style="padding:22px 28px 6px;">${emailButton(scoreUrl, "Predict the score →", { bg: GREEN, color: "#ffffff" })}</td></tr>
  <tr><td style="padding:18px 28px 0;font-family:${SANS};">
    <p style="margin:0;font-size:15px;line-height:1.6;color:${MUTED};">Vamos,<br><strong style="color:${INK};">LaFamilia</strong></p>
  </td></tr>
  <tr><td style="padding:10px 28px 6px;font-family:${SANS};">
    <p style="margin:0;font-size:12px;color:${MUTED};text-align:center;">A community game, not betting.</p>
  </td></tr>`;
  return emailShell({
    preheader: "Predict Mexico vs South Africa before kickoff and earn bonus points.",
    body,
  });
}

// ── Daily "locking soon" Bonus Score Pick nudge (one per user per day) ──
/** Stable per-DAY template id for the email log (idempotency). One nudge per
 * user per PT day, no matter how many games lock that day. */
export function scoreLockTemplateId(ptDate: string): string {
  return `score-lock-${ptDate}`;
}
export function scoreLockingSoonSubject(matchCount: number): string {
  return matchCount === 1 ? "A bonus pick locks soon ⏳" : `${matchCount} bonus picks lock soon ⏳`;
}
/** Daily nudge to anyone with un-predicted games locking in the next ~24h. Lists
 * those games with their lock (kickoff) time, leads with the member's current
 * standing + points on the line, and ends with the "runs all tournament" +
 * WhatsApp footer. Singular/plural copy adapts. */
export function renderScoreLockingSoon(p: {
  firstName: string;
  /** The matches to show — only ones this member hasn't predicted yet. */
  matches: { teamA: string; teamB: string; closesLabel: string }[];
  scoreUrl: string;
  /** Current Overall points + rank, shown only once scoring has started. */
  points?: number | null;
  rank?: number | null;
  totalPlayers?: number | null;
}): string {
  const multi = p.matches.length > 1;
  const onLine = p.matches.length * 3; // up to +3 per match

  // Game-oriented standing — "you have points to win", not just "a match exists".
  const hasStanding = typeof p.rank === "number" && p.rank > 0;
  const pts = p.points ?? 0;
  const standingBlock = hasStanding
    ? `<tr><td style="padding:16px 28px 0;font-family:${SANS};">
    <div style="background:${PAGE};border-radius:14px;padding:14px 18px;">
      <p style="margin:0;font-size:15px;line-height:1.6;color:${MUTED};">
        You're on <strong style="color:${INK};">${pts} ${pts === 1 ? "point" : "points"}</strong>${p.totalPlayers ? `, sitting <strong style="color:${INK};">#${p.rank} of ${p.totalPlayers}</strong>` : `, rank <strong style="color:${INK};">#${p.rank}</strong>`}. There ${onLine === 1 ? "is" : "are"} <strong style="color:${INK};">up to ${onLine} ${onLine === 1 ? "point" : "points"}</strong> on the line below.
      </p>
    </div>
  </td></tr>`
    : "";

  const matchRows = p.matches
    .map(
      (m) => `
  <tr><td style="padding:8px 28px 0;font-family:${SANS};">
    <div style="background:${PAGE};border-radius:14px;padding:14px 18px;">
      <p style="margin:0;font-size:16px;font-weight:800;color:${INK};">${m.teamA} vs ${m.teamB}</p>
      <p style="margin:4px 0 0;font-size:14px;color:${MUTED};">Locks: <strong style="color:${INK};">${m.closesLabel}</strong></p>
    </div>
  </td></tr>`,
    )
    .join("");

  // Permanent footer: every reminder reminds them this keeps going + invites
  // them to the WhatsApp community.
  const footer = `
  <tr><td style="padding:24px 28px 0;font-family:${SANS};">
    <div style="border-top:1px solid #e7e1d4;padding-top:18px;">
      <p style="margin:0;font-size:14px;line-height:1.6;color:${MUTED};">
        ⚽ <strong style="color:${INK};">Bonus score picks run all tournament.</strong> Earn up to 3 extra points every time you predict the score of a LatAm or Spain match — not just this one.
      </p>
      <p style="margin:14px 0 0;font-size:14px;line-height:1.6;color:${MUTED};">
        📱 The La Copa WhatsApp group is where we debate, talk through every game, and cry and scream together. <a href="${JOIN_URL}" target="_blank" style="color:${INK};font-weight:700;text-decoration:underline;">Join the familia →</a>
      </p>
    </div>
  </td></tr>`;

  const body = `
  <tr><td style="padding:32px 28px 6px;font-family:${SANS};">
    <div style="font-size:34px;">⚽️</div>
    <h1 style="margin:10px 0 0;font-size:24px;font-weight:800;color:${INK};">Familiaaaa ⚽️</h1>
    <p style="margin:14px 0 0;font-size:16px;line-height:1.6;color:${MUTED};">
      Heads up — ${multi ? "these bonus picks lock" : "this bonus pick locks"} soon. Lock ${multi ? "them" : "it"} in before kickoff and grab the points:
    </p>
  </td></tr>
  ${standingBlock}
  ${matchRows}
  <tr><td style="padding:18px 28px 0;font-family:${SANS};">
    <p style="margin:0;font-size:15px;line-height:1.7;color:${MUTED};">
      Exact score = <strong style="color:${INK};">3 bonus points</strong><br>
      Correct winner or draw = <strong style="color:${INK};">1 point</strong>
    </p>
  </td></tr>
  ${cta(p.scoreUrl, multi ? "Lock my picks →" : "Lock my pick →")}
  ${footer}
  <tr><td style="padding:18px 28px 6px;font-family:${SANS};">
    <p style="margin:0;font-size:15px;line-height:1.6;color:${MUTED};">Vamos,<br><strong style="color:${INK};">LaFamilia</strong></p>
  </td></tr>`;
  return emailShell({
    preheader: "You've got points to win — today's LatAm + Spain bonus picks are open.",
    body,
  });
}

// ── Points earned (sent when an admin enters a match's final score) ──
/** Per-match template id for the email log (idempotency). */
export function scorePointsTemplateId(matchId: string): string {
  return `score-points-${matchId}`;
}
export function scorePointsSubject(points: number, teamA: string, teamB: string): string {
  return points >= 3
    ? "🎯 Exact score — you earned +3 points!"
    : `✅ +${points} ${points === 1 ? "point" : "points"} — ${teamA} vs ${teamB}`;
}
/** Sent to members who EARNED points on a just-scored game: the result, their
 * pick, what they earned and why, their new total, what's next, + community. */
export function renderScorePoints(p: {
  firstName: string;
  teamA: string;
  teamB: string;
  finalA: number;
  finalB: number;
  predA: number;
  predB: number;
  points: number;
  /** The member's overall total after this game. */
  total: number;
  /** Upcoming bonus-point games with their deadlines. */
  upcoming: { match: string; dateLabel: string }[];
  scoreUrl: string;
}): string {
  const exact = p.points >= 3;
  const why = exact
    ? "you nailed the exact score"
    : "you called the right result";
  const upcomingRows =
    p.upcoming.length > 0
      ? `
  <tr><td style="padding:20px 28px 0;font-family:${SANS};">
    <p style="margin:0 0 8px;font-size:14px;font-weight:700;color:${INK};">More bonus points are coming:</p>
    ${p.upcoming
      .map(
        (u) =>
          `<p style="margin:0 0 4px;font-size:14px;color:${MUTED};">• <strong style="color:${INK};">${u.match}</strong> — ${u.dateLabel}</p>`,
      )
      .join("")}
  </td></tr>`
      : "";
  const body = `
  <tr><td style="padding:32px 28px 6px;font-family:${SANS};">
    <div style="font-size:34px;">🎉</div>
    <h1 style="margin:10px 0 0;font-size:26px;font-weight:800;color:${INK};">You earned +${p.points} ${p.points === 1 ? "point" : "points"}, ${p.firstName}!</h1>
    <p style="margin:14px 0 0;font-size:16px;line-height:1.6;color:${MUTED};">
      <strong style="color:${INK};">${p.teamA} ${p.finalA}–${p.finalB} ${p.teamB}</strong> is final. You predicted
      <strong style="color:${INK};">${p.predA}–${p.predB}</strong> — ${why}.
    </p>
  </td></tr>
  <tr><td style="padding:16px 28px 0;font-family:${SANS};">
    <div style="background:${PAGE};border-radius:14px;padding:14px 18px;text-align:center;">
      <p style="margin:0;font-size:13px;color:${MUTED};text-transform:uppercase;letter-spacing:1px;">Your total</p>
      <p style="margin:4px 0 0;font-size:30px;font-weight:900;color:${INK};">${p.total} ${p.total === 1 ? "point" : "points"}</p>
    </div>
  </td></tr>
  ${upcomingRows}
  ${cta(p.scoreUrl, "View your scores →")}
  <tr><td style="padding:24px 28px 0;font-family:${SANS};">
    <div style="border-top:1px solid #e7e1d4;padding-top:18px;">
      <p style="margin:0;font-size:15px;font-weight:800;color:${INK};">⚽ Join the La Copa conversation</p>
      <p style="margin:8px 0 0;font-size:14px;line-height:1.6;color:${MUTED};">
        The La Copa WhatsApp group is where the familia debates, talks through every game, and cries and screams together. Come celebrate your points with us.
      </p>
      <p style="margin:12px 0 0;font-size:14px;line-height:1.6;">
        <a href="${JOIN_URL}" target="_blank" style="color:${INK};font-weight:700;text-decoration:underline;">Join La Copa de LaFamilia →</a>
      </p>
    </div>
  </td></tr>
  <tr><td style="padding:18px 28px 6px;font-family:${SANS};">
    <p style="margin:0;font-size:15px;line-height:1.6;color:${MUTED};">Vamos,<br><strong style="color:${INK};">LaFamilia</strong></p>
  </td></tr>`;
  return emailShell({
    preheader: `You earned +${p.points} on ${p.teamA} vs ${p.teamB}. Here's where you stand.`,
    body,
  });
}

// ── Shared bits for the launch + catch-up emails ─────────────────────
function communityFooter(): string {
  return `
  <tr><td style="padding:24px 28px 0;font-family:${SANS};">
    <div style="border-top:1px solid #e7e1d4;padding-top:18px;">
      <p style="margin:0;font-size:14px;line-height:1.6;color:${MUTED};">
        ⚽ <strong style="color:${INK};">Bonus score picks run all tournament.</strong> Predict any LatAm or Spain game whenever you want — each one locks at kickoff.
      </p>
      <p style="margin:14px 0 0;font-size:14px;line-height:1.6;color:${MUTED};">
        📱 The La Copa WhatsApp group is where we debate, talk through every game, and cry and scream together. <a href="${JOIN_URL}" target="_blank" style="color:${INK};font-weight:700;text-decoration:underline;">Join the familia →</a>
      </p>
    </div>
  </td></tr>`;
}
function vamosRow(): string {
  return `<tr><td style="padding:18px 28px 6px;font-family:${SANS};"><p style="margin:0;font-size:15px;line-height:1.6;color:${MUTED};">Vamos,<br><strong style="color:${INK};">LaFamilia</strong></p></td></tr>`;
}

// ── #1 Launch: one-time "everything is open now" announcement ─────────
export const BONUS_LAUNCH_SUBJECT = "All bonus picks are open ⚽️";
export function renderBonusLaunch(p: { firstName: string; scoreUrl: string }): string {
  const body = `
  ${emailIntro({
    emoji: "⚽️",
    heading: `All bonus picks are open, ${p.firstName}`,
    paras: [
      "Big change, familia: <strong>every</strong> bonus score pick is open right now — no more waiting for each game's window.",
      "Predict as many as you want, whenever you want. Each pick locks the moment that game kicks off, so lock them in early.",
      `Exact score = <strong style="color:${INK};">3 points</strong> · correct winner or draw = <strong style="color:${INK};">1 point</strong>.`,
    ],
  })}
  ${cta(p.scoreUrl, "Make my picks →")}
  ${communityFooter()}
  ${vamosRow()}`;
  return emailShell({
    preheader: "Predict every LatAm + Spain score now — lock before each kickoff.",
    body,
  });
}

// ── #3 Catch-up: to members far behind (under 40% complete) ───────────
export function bonusCatchupSubject(made: number, total: number): string {
  return `You've made ${made} of ${total} bonus picks — catch up ⚽️`;
}
export function renderBonusCatchup(p: {
  firstName: string;
  made: number;
  total: number;
  scoreUrl: string;
}): string {
  const remaining = Math.max(0, p.total - p.made);
  const body = `
  ${emailIntro({
    emoji: "⚽️",
    heading: `Catch up, ${p.firstName}`,
    paras: [
      `You've locked <strong style="color:${INK};">${p.made} of ${p.total}</strong> bonus score picks so far — there's still a lot of points out there with your name on them.`,
      "Good news: <strong>every</strong> LatAm + Spain game is open right now. Predict as many as you want in one sitting — each pick only locks when that game kicks off.",
      `You've got <strong style="color:${INK};">${remaining} game${remaining === 1 ? "" : "s"} still open</strong> — that's up to <strong style="color:${INK};">${remaining * 3} points</strong> on the table.`,
      `Exact score = <strong style="color:${INK};">3 pts</strong> · correct winner or draw = <strong style="color:${INK};">1 pt</strong>.`,
    ],
  })}
  ${cta(p.scoreUrl, "Make my picks →")}
  ${communityFooter()}
  ${vamosRow()}`;
  return emailShell({
    preheader: "Every game is open. Predict now, lock before kickoff.",
    body,
  });
}

// ── Sample set (for previews + test sends) ───────────────────────────
export type SampleEmail = { key: string; label: string; subject: string; html: string };

export function buildSampleEmails(appUrl: string): SampleEmail[] {
  const picks = `${appUrl}/picks`;
  const board = `${appUrl}/leaderboard`;
  return [
    {
      key: "confirmation",
      label: "1 · You're in (on submit)",
      subject: CONFIRMATION_SUBJECT,
      html: renderConfirmationEmailHtml({
        to: "", firstName: "Pilar", champion: "Brazil",
        editUrl: `${appUrl}/r/sample`, bonusUrl: `${appUrl}/picks/bonus?token=sample`,
        shareUrl: `${appUrl}/copa/pilar`, deadlineIso: "2026-06-11T20:00:00Z",
      }),
    },
    { key: "last-call", label: "2 · Last call (24h before lock)", subject: "Last day to change your picks", html: renderLastCall({ firstName: "Pilar", picksUrl: picks }) },
    { key: "locked-in", label: "3 · Locked in (kickoff)", subject: "Picks are locked. Game on.", html: renderLockedIn({ firstName: "Pilar", leaderboardUrl: board }) },
    { key: "first-points", label: "4 · First points (group stage ends)", subject: "Your first points are in", html: renderFirstPoints({ firstName: "Pilar", rank: 4, total: 38, leaderboardUrl: board }) },
    { key: "round-open", label: "5 · Round opens", subject: "Round of 32 picks are open", html: renderRoundOpen({ round: "Round of 32", picksUrl: picks, locksLabel: "Saturday at noon ET" }) },
    { key: "closing-soon", label: "6 · Closing soon", subject: "Round of 32 picks lock soon", html: renderClosingSoon({ round: "Round of 32", hours: 2, picksUrl: picks }) },
    { key: "score-update", label: "7 · You moved (after scoring)", subject: "New scores. You're 2nd now.", html: renderScoreUpdate({ delta: 2, rank: 2, total: 38, rivalLine: "You're 3 points behind Mateo.", nextLabel: "Round of 16 picks open Saturday.", leaderboardUrl: board }) },
    { key: "final-four", label: "8 · Final Four", subject: "The Final Four is set", html: renderFinalFour({ rank: 2, total: 38, picksUrl: picks }) },
    { key: "the-final", label: "9 · The final", subject: "One match left", html: renderTheFinal({ firstName: "Pilar", picksUrl: picks }) },
    { key: "wrap", label: "10 · Winner / wrap", subject: "It's over. You finished 2nd.", html: renderWrap({ firstName: "Pilar", champion: "Brazil", rank: 2, total: 38, isWinner: false, standingsUrl: board }) },
    {
      key: "score-locking-soon",
      label: "11 · Bonus picks locking soon",
      subject: scoreLockingSoonSubject(2),
      html: renderScoreLockingSoon({
        firstName: "Pilar",
        scoreUrl: `${appUrl}/picks/score`,
        points: 4,
        rank: 12,
        totalPlayers: 115,
        matches: [
          { teamA: "Brazil", teamB: "Morocco", closesLabel: "Sat, Jun 13, 3:00 PM PT" },
          { teamA: "Haiti", teamB: "Scotland", closesLabel: "Sat, Jun 13, 6:00 PM PT" },
        ],
      }),
    },
    {
      key: "score-points",
      label: "12 · You earned points (after a game is scored)",
      subject: scorePointsSubject(3, "Mexico", "South Africa"),
      html: renderScorePoints({
        firstName: "Pilar",
        teamA: "Mexico",
        teamB: "South Africa",
        finalA: 2,
        finalB: 0,
        predA: 2,
        predB: 0,
        points: 3,
        total: 9,
        upcoming: [
          { match: "Brazil vs Morocco", dateLabel: "June 18" },
          { match: "Mexico vs Czechia", dateLabel: "June 24" },
        ],
        scoreUrl: `${board}?view=score`,
      }),
    },
  ];
}

// ── Tournament-underway broadcast (one-off, personalized) ────────────
// "Your bracket is locked, but you can still climb." Sent once, manually, to
// every participant, with copy that adapts to where each player stands. Pure +
// testable; the admin route computes these params from live data.

export const TOURNAMENT_UNDERWAY_TEMPLATE_ID = "tournament-underway-2026-06-28";

export type UnderwayParams = {
  firstName: string;
  rank: number | null;
  total: number | null;
  championName: string | null;
  /** Both only ever true when the data is 100% sure; mutually exclusive. */
  championOut: boolean;
  championAlive: boolean;
  hasPoints: boolean;
  /** The next open match they have NOT predicted (drives the primary CTA), else null. */
  nextOpenMatchLabel: string | null;
  nextOpenKickoffLabel: string | null;
  /** True when there were open matches and they've predicted them all. */
  caughtUpOnScores: boolean;
  scoreUrl: string;
  liveUrl: string;
  referralCount: number;
  playUrl: string;
  chatUrl: string;
};

/** Dynamic, state-aware subject. Precedence: champion out → zero points →
 *  champion alive → has points → neutral fallback. */
export function tournamentUnderwaySubject(p: UnderwayParams): string {
  const f = p.firstName || "Familia";
  if (p.championOut) return `🔵 ${f}, your champion is out. You're still in this.`;
  if (!p.hasPoints) return `🟠 ${f}, it's still early. Your next points are waiting.`;
  if (p.championAlive) return `🟢 ${f}, your champion is still alive. Keep climbing ⚽`;
  if (p.hasPoints) return `🟡 ${f}, you're already on the board. Here's your next chance.`;
  return `${f}, you're still in it. Here's your next chance ⚽`;
}

function underwayWhereYouStand(p: UnderwayParams): string {
  const rankStr = p.rank ? `#${p.rank} of 115` : "in the race with the Familia";
  const ptsStr = p.total != null ? ` with ${p.total} ${p.total === 1 ? "point" : "points"}` : "";
  if (p.championOut && p.championName) {
    return `${p.championName} is out — but you're far from done. You're ${rankStr}${ptsStr}, and there are plenty more to grab.`;
  }
  if (!p.hasPoints) {
    return p.rank
      ? `You're on the board at ${rankStr}. No points yet — but it's early, and every match from here is a fresh chance.`
      : `You're in the game with the Familia. No points yet — but it's early, and every match is a fresh chance.`;
  }
  if (p.championAlive && p.championName) {
    return `${p.championName} is still in it, and you're ${rankStr}${ptsStr}. Keep climbing.`;
  }
  return `You're ${rankStr}${ptsStr} — and there's more up for grabs.`;
}

function underwayPrimaryCta(p: UnderwayParams): { text: string; label: string; url: string } {
  if (p.nextOpenMatchLabel) {
    const when = p.nextOpenKickoffLabel ? ` before kickoff (${p.nextOpenKickoffLabel})` : " before it kicks off";
    return {
      text: `Your next move: <strong>${p.nextOpenMatchLabel}</strong> is open. Predict the score${when}.`,
      label: "Predict the score →",
      url: p.scoreUrl,
    };
  }
  if (p.caughtUpOnScores) {
    return {
      text: "Nice — you're caught up on score predictions. Next up: pick who advances in the knockouts.",
      label: "Pick who advances →",
      url: p.liveUrl,
    };
  }
  return {
    text: "Next up: pick who advances in the knockouts — pick the team that moves on.",
    label: "Pick who advances →",
    url: p.liveUrl,
  };
}

function underwayReferralLine(p: UnderwayParams): string {
  return p.referralCount > 0
    ? `You brought ${p.referralCount} to La Copa — that lives in Familia Honors now 🏅 (separate from the main score).`
    : "Heads up: Bringing the Familia (referrals) is closed now — it's a Familia Honor, separate from the main score.";
}

function underwayChatLine(chatUrl: string): string {
  return /^https?:\/\//.test(chatUrl)
    ? `▸ <a href="${chatUrl}" target="_blank" style="color:${GREEN};font-weight:700;text-decoration:none;">Join the La Copa chat</a>`
    : `▸ Join the La Copa chat: <strong>${chatUrl}</strong>`;
}

export function renderTournamentUnderway(p: UnderwayParams): string {
  const ctaInfo = underwayPrimaryCta(p);
  const body = `
${emailIntro({
    emoji: "⚽",
    heading: `Hola, ${p.firstName || "Familia"} 👋`,
    paras: [
      "The World Cup is on, and your La Copa bracket is locked in. But you're not done — the leaderboard's moving, with new points up for grabs.",
    ],
  })}
  <tr><td style="padding:6px 28px 0;font-family:${SANS};">
    <p style="margin:0;font-size:16px;line-height:1.6;color:${INK};font-weight:600;">${underwayWhereYouStand(p)}</p>
  </td></tr>

  <tr><td style="padding:24px 28px 0;font-family:${SANS};">
    <p style="margin:0 0 4px;font-size:15px;font-weight:800;color:${INK};">You can still earn points two ways:</p>
    <div style="background:${PAGE};border-radius:14px;padding:16px 18px;margin-top:12px;">
      <p style="margin:0;font-size:16px;font-weight:700;color:${INK};">⚽ Predict the score</p>
      <p style="margin:5px 0 0;font-size:14px;line-height:1.55;color:${MUTED};">For select LatAm + Spain matches.<br>Exact score = +3. Correct winner or draw = +1.<br>Locks at kickoff.</p>
    </div>
    <div style="background:${PAGE};border-radius:14px;padding:16px 18px;margin-top:10px;">
      <p style="margin:0;font-size:16px;font-weight:700;color:${INK};">🏆 Pick who advances</p>
      <p style="margin:5px 0 0;font-size:14px;line-height:1.55;color:${MUTED};">For knockout games.<br>Pick the team that moves on.</p>
    </div>
    <p style="margin:12px 0 0;font-size:14px;color:${MUTED};">It all counts toward the same leaderboard.</p>
  </td></tr>

  <tr><td style="padding:22px 28px 0;font-family:${SANS};">
    <p style="margin:0;font-size:16px;line-height:1.6;color:${INK};">${ctaInfo.text}</p>
  </td></tr>
  ${cta(ctaInfo.url, ctaInfo.label)}

  <tr><td style="padding:18px 28px 0;font-family:${SANS};">
    <p style="margin:0;font-size:13px;line-height:1.5;color:${MUTED};">${underwayReferralLine(p)}</p>
  </td></tr>

  <tr><td style="padding:20px 28px 4px;font-family:${SANS};">
    <p style="margin:0;font-size:15px;color:${INK};font-weight:700;">When one of us wins, the Familia wins. 🌎</p>
    <p style="margin:12px 0 0;font-size:14px;line-height:1.9;color:${MUTED};">
      ▸ <a href="${p.playUrl}" target="_blank" style="color:${GREEN};font-weight:700;text-decoration:none;">Play La Copa</a><br>
      ${underwayChatLine(p.chatUrl)}
    </p>
  </td></tr>`;
  return emailShell({
    preheader: "Your bracket is locked, but you can still climb. Here's your next move.",
    body,
  });
}
