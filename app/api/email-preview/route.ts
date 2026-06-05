import { buildSampleEmails } from "@/lib/email-template";
import { sendEmail } from "@/lib/email";
import { env } from "@/lib/env";

export const dynamic = "force-dynamic";

// Preview + test-send the email set.
//   /api/email-preview                 → index of all emails (links)
//   /api/email-preview?key=confirmation→ render that one email as HTML
//   /api/email-preview?send=you@x.com&secret=CRON_SECRET → email one of each
//
// Rendering shows SAMPLE data only (no real members), so it's safe to view.
// Sending is gated by CRON_SECRET and no-ops unless RESEND_API_KEY is set.
export async function GET(req: Request) {
  const url = new URL(req.url);
  const samples = buildSampleEmails(env.NEXT_PUBLIC_APP_URL);

  // ── Test-send one of each ──
  const send = url.searchParams.get("send");
  if (send) {
    if (url.searchParams.get("secret") !== env.CRON_SECRET) {
      return Response.json({ ok: false, error: "Bad secret" }, { status: 401 });
    }
    if (!env.RESEND_API_KEY) {
      return Response.json({ ok: false, error: "RESEND_API_KEY not set — email service is off." }, { status: 400 });
    }
    const results: Record<string, boolean> = {};
    for (const s of samples) {
      results[s.key] = await sendEmail({ to: send, subject: `[Sample] ${s.subject}`, html: s.html });
    }
    return Response.json({ ok: true, sentTo: send, results });
  }

  // Viewing previews is dev-only so the email designs aren't public in prod.
  // (The secret-gated send above still works in production.)
  if (process.env.NODE_ENV === "production") {
    return new Response("Not found", { status: 404 });
  }

  // ── Render a single email ──
  const key = url.searchParams.get("key");
  if (key) {
    const s = samples.find((x) => x.key === key);
    if (!s) return new Response("Unknown email key", { status: 404 });
    return new Response(s.html, { headers: { "content-type": "text/html; charset=utf-8" } });
  }

  // ── Index ──
  const rows = samples
    .map(
      (s) =>
        `<li style="margin:0 0 10px;"><a href="/api/email-preview?key=${s.key}" style="color:#0b6b3a;font-weight:700;text-decoration:none;">${s.label}</a> <span style="color:#6f6a60;">— ${s.subject}</span></li>`,
    )
    .join("");
  const html = `<!doctype html><meta charset="utf-8"><title>La Copa emails</title>
  <div style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;max-width:640px;margin:40px auto;padding:0 20px;">
    <h1 style="font-size:22px;">La Copa de LaFamilia — email previews</h1>
    <p style="color:#6f6a60;">Sample data only. Tap any email to preview it.</p>
    <ul style="line-height:1.6;padding-left:18px;">${rows}</ul>
    <p style="color:#6f6a60;font-size:13px;margin-top:24px;">To email one of each to yourself once Resend is on:<br>
    <code>/api/email-preview?send=you@email.com&amp;secret=CRON_SECRET</code></p>
  </div>`;
  return new Response(html, { headers: { "content-type": "text/html; charset=utf-8" } });
}
