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

/** The post-submission confirmation email. */
export async function sendPredictionConfirmation(params: ConfirmationParams): Promise<void> {
  await sendEmail({
    to: params.to,
    subject: CONFIRMATION_SUBJECT,
    html: renderConfirmationEmailHtml(params),
  });
}
