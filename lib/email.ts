import "server-only";
import { env } from "./env";
import {
  CONFIRMATION_SUBJECT,
  renderConfirmationEmailHtml,
  type ConfirmationParams,
} from "./email-template";

// Sends the post-submission confirmation email via Resend's HTTP API (no SDK).
// Safe no-op until RESEND_API_KEY is configured, so submissions never fail
// because email isn't set up yet.
export async function sendPredictionConfirmation(params: ConfirmationParams): Promise<void> {
  if (!env.RESEND_API_KEY) return; // email not configured yet — no-op

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: env.EMAIL_FROM,
      to: [params.to],
      subject: CONFIRMATION_SUBJECT,
      html: renderConfirmationEmailHtml(params),
    }),
  });

  if (!res.ok) {
    console.error("Resend send failed:", res.status, await res.text().catch(() => ""));
  }
}
