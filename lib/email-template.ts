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

// ── Daily Bonus Score Pick reminder (grouped — one per user per day) ──
/** Stable per-DAY template id for the email log (idempotency). One email per
 * user per PT day, no matter how many windows open that day. */
export function scoreWindowDayTemplateId(ptDate: string): string {
  return `score-window-day-${ptDate}`;
}
export function scoreWindowDaySubject(matchCount: number): string {
  return matchCount === 1 ? "Today's bonus pick is open ⚽️" : "Today's bonus picks are open ⚽️";
}
/** Grouped daily reminder: lists the day's still-open-for-you score picks (in
 * kickoff order) with each one's close time in PT. Leads with the member's
 * current standing + points on the line, and always ends with the "bonus picks
 * run all tournament" + WhatsApp footer. Singular/plural copy adapts. */
export function renderScoreWindowDay(p: {
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
      <p style="margin:4px 0 0;font-size:14px;color:${MUTED};">Closes: <strong style="color:${INK};">${m.closesLabel}</strong></p>
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
        📱 Want reminders, leaderboard updates, and match banter? <a href="${JOIN_URL}" target="_blank" style="color:${INK};font-weight:700;text-decoration:underline;">Join the La Copa WhatsApp community →</a>
      </p>
    </div>
  </td></tr>`;

  const body = `
  <tr><td style="padding:32px 28px 6px;font-family:${SANS};">
    <div style="font-size:34px;">⚽️</div>
    <h1 style="margin:10px 0 0;font-size:24px;font-weight:800;color:${INK};">Familiaaaa ⚽️</h1>
    <p style="margin:14px 0 0;font-size:16px;line-height:1.6;color:${MUTED};">
      Today's bonus score pick${multi ? "s are" : " is"} open — lock ${multi ? "them" : "it"} in before kickoff and grab the points:
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
  ${cta(p.scoreUrl, multi ? "Make your bonus picks →" : "Make your bonus pick →")}
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
        The leaderboard is fun, but the real chisme is in the community — members share predictions, reactions, and reminders before every match. Come celebrate your points and see what everyone's saying.
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
      key: "score-window-day",
      label: "11 · Today's bonus picks (grouped)",
      subject: scoreWindowDaySubject(2),
      html: renderScoreWindowDay({
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
