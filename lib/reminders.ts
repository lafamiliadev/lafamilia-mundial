// The reminder-email schedule: which email fires, when, and how it's rendered
// per member. Pure (no secrets / no I/O) so it can be unit-tested and dry-run.
// The cron (app/api/cron/reminders) walks these and sends the due ones once.

import { LIVE_PICKS_ENABLED } from "./flags";
import { LIVE_ROUNDS, SCORING_MILESTONES } from "./schedule";
import {
  renderFinalFour,
  renderFirstPoints,
  renderLastCall,
  renderLockedIn,
  renderRoundOpen,
  renderTheFinal,
  renderWrap,
} from "./email-template";

export type ReminderRecipient = { firstName: string; rank: number };

export type ReminderCampaign = {
  /** Stable id — used to mark "already sent" so it fires exactly once. */
  key: string;
  /** When this email becomes due (ms epoch). */
  dueAtMs: number;
  /** Subject — a function when it varies per member (e.g. the winner). */
  subject: string | ((r: ReminderRecipient) => string);
  /** Full HTML for one member. */
  render: (r: ReminderRecipient) => string;
};

const DAY = 24 * 60 * 60 * 1000;
const ms = (iso: string) => new Date(iso).getTime();

/** "Saturday at 12:00 PM EDT" — for the round-lock line. */
function whenLabel(iso: string): string {
  try {
    return new Intl.DateTimeFormat("en-US", {
      weekday: "long",
      hour: "numeric",
      minute: "2-digit",
      timeZone: "America/New_York",
      timeZoneName: "short",
    }).format(new Date(iso));
  } catch {
    return "kickoff";
  }
}

export type ReminderContext = {
  lockTimeIso: string;
  appUrl: string;
  total: number;
  champion: string | null; // resolved team name once the final is in
  /** Knockout rounds that have matchups entered. A round-open email only fires
   * for a round in this list, so we never email "picks are open" into a round
   * whose matchups aren't set yet (which would be a dead end). */
  roundsReady: string[];
};

/** "July 14" — short date for "semifinal picks open …" copy. */
function shortDate(iso: string): string {
  try {
    return new Intl.DateTimeFormat("en-US", {
      month: "long",
      day: "numeric",
      timeZone: "America/New_York",
    }).format(new Date(iso));
  } catch {
    return "soon";
  }
}

/** Every reminder campaign with its fire time, given current settings/results. */
export function allReminderCampaigns(ctx: ReminderContext): ReminderCampaign[] {
  const lock = ms(ctx.lockTimeIso);
  const picks = `${ctx.appUrl}/picks`;
  const board = `${ctx.appUrl}/leaderboard`;

  // Per-round "picks are open" emails. Two gates:
  //  1. LIVE_PICKS_ENABLED — while the feature is off they'd link to a dead end.
  //  2. roundsReady — only fire once that round's matchups are actually set, so
  //     we never tell 60+ people "picks are open" and land them on an empty page.
  const ready = new Set(ctx.roundsReady);
  const roundEmails: ReminderCampaign[] = !LIVE_PICKS_ENABLED
    ? []
    : LIVE_ROUNDS.filter((r) => ready.has(r.round)).map((r) =>
        r.round === "final"
          ? {
              key: "round-open-final",
              dueAtMs: ms(r.opensIso),
              subject: "One match left",
              render: (rec) => renderTheFinal({ firstName: rec.firstName, picksUrl: picks }),
            }
          : {
              key: `round-open-${r.round}`,
              dueAtMs: ms(r.opensIso),
              subject: `${r.label} picks are open`,
              render: (rec) =>
                renderRoundOpen({
                  round: r.label,
                  picksUrl: picks,
                  locksLabel: whenLabel(r.locksIso),
                  rank: rec.rank,
                  total: ctx.total,
                }),
            },
      );

  const sfRound = LIVE_ROUNDS.find((r) => r.round === "sf");
  const sfOpensLabel = sfRound ? shortDate(sfRound.opensIso) : "soon";

  return [
    {
      key: "last-call",
      dueAtMs: lock - DAY,
      subject: "Last day to change your picks",
      render: (r) => renderLastCall({ firstName: r.firstName, picksUrl: picks }),
    },
    {
      key: "locked-in",
      dueAtMs: lock,
      subject: "Picks are locked. Game on.",
      render: (r) => renderLockedIn({ firstName: r.firstName, leaderboardUrl: board }),
    },
    {
      key: "first-points",
      dueAtMs: ms(SCORING_MILESTONES[0].dateIso),
      subject: "Your first points are in",
      render: (r) => renderFirstPoints({ firstName: r.firstName, rank: r.rank, total: ctx.total, leaderboardUrl: board }),
    },
    ...roundEmails,
    {
      key: "final-four",
      dueAtMs: ms(SCORING_MILESTONES[1].dateIso),
      subject: "The Final Four is set",
      render: (r) => renderFinalFour({ rank: r.rank, total: ctx.total, leaderboardUrl: board, sfOpensLabel }),
    },
    {
      key: "wrap",
      dueAtMs: ms(SCORING_MILESTONES[2].dateIso),
      subject: (r) => (r.rank === 1 ? "You won La Copa de LaFamilia" : `That's a wrap — you finished #${r.rank}`),
      render: (r) =>
        renderWrap({
          firstName: r.firstName,
          champion: ctx.champion ?? "Your champion",
          rank: r.rank,
          total: ctx.total,
          isWinner: r.rank === 1,
          standingsUrl: board,
        }),
    },
  ];
}

/** Campaigns whose time has come and that haven't been sent yet. */
export function dueReminderCampaigns(
  ctx: ReminderContext,
  nowMs: number,
  sent: string[],
): ReminderCampaign[] {
  return allReminderCampaigns(ctx).filter((c) => c.dueAtMs <= nowMs && !sent.includes(c.key));
}
