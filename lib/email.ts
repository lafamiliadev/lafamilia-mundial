import "server-only";
import { env } from "./env";
import { brandedFrom } from "./email-from";
import {
  CONFIRMATION_SUBJECT,
  renderConfirmationEmailHtml,
  type ConfirmationParams,
} from "./email-template";

// Sends email via Resend's HTTP API (no SDK). Safe no-op until RESEND_API_KEY
// is configured, so submissions never fail because email isn't set up yet.
export async function sendEmail(opts: {
  to: string;
  subject: string;
  html: string;
}): Promise<boolean> {
  if (!env.RESEND_API_KEY) return false; // email not configured yet — no-op

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: brandedFrom(env.EMAIL_FROM),
      to: [opts.to],
      subject: opts.subject,
      html: opts.html,
    }),
  });

  if (!res.ok) {
    console.error("Resend send failed:", res.status, await res.text().catch(() => ""));
    return false;
  }
  return true;
}

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
const looksValid = (email: string) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email);

/**
 * Bulk send via Resend's BATCH endpoint (up to 100 messages per request). One
 * cron run can email 100+ people; sending them one-by-one trips Resend's
 * per-second rate limit and ~half get rejected. Batching = a handful of requests
 * instead of hundreds, so nothing is rate-limited. Returns a boolean per input
 * (aligned to order). Structurally-invalid addresses are marked false without a
 * request so one bad address can't fail a whole batch.
 */
export async function sendEmailBatch(
  messages: { to: string; subject: string; html: string }[],
): Promise<boolean[]> {
  const results = new Array<boolean>(messages.length).fill(false);
  if (!env.RESEND_API_KEY || messages.length === 0) return results;
  const from = brandedFrom(env.EMAIL_FROM);
  const valid = messages.map((m, i) => ({ i, m })).filter((x) => looksValid(x.m.to));

  for (let start = 0; start < valid.length; start += 100) {
    const chunk = valid.slice(start, start + 100);
    const payload = chunk.map((x) => ({ from, to: [x.m.to], subject: x.m.subject, html: x.m.html }));
    let ok = false;
    for (let attempt = 0; attempt < 3 && !ok; attempt++) {
      if (attempt > 0) await sleep(800 * attempt); // backoff before retry
      try {
        const res = await fetch("https://api.resend.com/emails/batch", {
          method: "POST",
          headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (res.ok) ok = true;
        else console.error("Resend batch failed:", res.status, (await res.text().catch(() => "")).slice(0, 160));
      } catch (err) {
        console.error("Resend batch error:", (err as Error).message);
      }
    }
    for (const x of chunk) results[x.i] = ok;
    if (start + 100 < valid.length) await sleep(600); // pace between batch requests
  }
  return results;
}

/** The post-submission confirmation email. */
export async function sendPredictionConfirmation(params: ConfirmationParams): Promise<void> {
  await sendEmail({
    to: params.to,
    subject: CONFIRMATION_SUBJECT,
    html: renderConfirmationEmailHtml(params),
  });
}
