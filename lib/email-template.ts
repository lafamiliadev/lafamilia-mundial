// Pure rendering for the confirmation email (no server-only / no secrets), so it
// can be previewed and unit-tested. lib/email.ts handles the actual Resend send.

const SIEMBRA_URL = "https://givebutter.com/siembra-con-lafamilia-foundation";

const NAVY = "#0a2342";
const GOLD = "#c8a24a";
const GREEN = "#0b6b3a";
const PAGE = "#f4f1ea";
const INK = "#1b2430";
const MUTED = "#6f6a60";

export type ConfirmationParams = {
  to: string;
  firstName: string;
  editUrl: string;
  shareUrl: string;
  deadlineIso: string;
};

export function formatDeadline(iso: string): string {
  try {
    return new Intl.DateTimeFormat("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
      timeZone: "America/New_York",
      timeZoneName: "short",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

function button(href: string, label: string, opts: { bg: string; color: string; border?: string }): string {
  const border = opts.border ? `border:2px solid ${opts.border};` : "border:0;";
  return `<a href="${href}" target="_blank" style="display:block;background:${opts.bg};color:${opts.color};${border}text-decoration:none;font-weight:700;font-size:16px;text-align:center;padding:15px 20px;border-radius:14px;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;">${label}</a>`;
}

export const CONFIRMATION_SUBJECT = "⚽ Your La Copa de LaFamilia predictions are in!";

export function renderConfirmationEmailHtml(params: ConfirmationParams): string {
  const sans = "-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Helvetica,Arial,sans-serif";
  const deadline = formatDeadline(params.deadlineIso);
  const waMessage = `I just made my La Copa de LaFamilia predictions ⚽️ Can you beat my bracket?\n\n${params.shareUrl}`;
  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(waMessage)}`;
  const { firstName, editUrl, shareUrl } = params;

  return `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="x-apple-disable-message-reformatting"><title>Your predictions are in</title></head>
<body style="margin:0;padding:0;background:${PAGE};">
<span style="display:none;max-height:0;overflow:hidden;opacity:0;color:${PAGE};">You're in! Edit your picks anytime before kickoff, and bring the Familia. ⚽🌎</span>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${PAGE};padding:24px 12px;">
<tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 6px 24px rgba(10,35,66,0.08);">

  <tr><td style="background:${NAVY};padding:26px 28px;text-align:center;">
    <div style="font-family:${sans};font-size:26px;font-weight:800;letter-spacing:-0.5px;color:#ffffff;">LaFamilia</div>
    <div style="font-family:${sans};font-size:12px;font-weight:700;letter-spacing:3px;color:${GOLD};margin-top:6px;">LA COPA DE LAFAMILIA · 2026 ⚽</div>
  </td></tr>

  <tr><td style="padding:32px 28px 8px;font-family:${sans};">
    <div style="font-size:34px;">🎉</div>
    <h1 style="margin:10px 0 0;font-size:26px;font-weight:800;color:${INK};">You're in, ${firstName}!</h1>
    <p style="margin:12px 0 0;font-size:16px;line-height:1.55;color:${MUTED};">Your La Copa de LaFamilia 2026 predictions have been recorded. Thanks for playing — now let's see whose soccer instincts survive the tournament. ⚽🌎</p>
  </td></tr>

  <tr><td style="padding:22px 28px 6px;">
    ${button(whatsappUrl, "📲 Share with the Familia on WhatsApp", { bg: GREEN, color: "#ffffff" })}
    <p style="margin:10px 0 0;font-size:13px;line-height:1.5;color:${MUTED};text-align:center;font-family:${sans};">Challenge fellow Familia members to beat your bracket.</p>
  </td></tr>

  <tr><td style="padding:18px 28px 6px;font-family:${sans};">
    <div style="border-top:1px solid #eee;padding-top:22px;">
      <h2 style="margin:0;font-size:18px;font-weight:800;color:${INK};">✏️ Edit your predictions</h2>
      <p style="margin:8px 0 14px;font-size:15px;line-height:1.55;color:${MUTED};">Changed your mind? You can update your predictions until <strong style="color:${INK};">${deadline}</strong>. After that, all brackets will be locked.</p>
      ${button(editUrl, "Edit my predictions", { bg: "#ffffff", color: NAVY, border: NAVY })}
    </div>
  </td></tr>

  <tr><td style="padding:18px 28px 6px;font-family:${sans};">
    <div style="background:${NAVY};border-radius:16px;padding:22px;">
      <h2 style="margin:0;font-size:18px;font-weight:800;color:#ffffff;">🌱 Why we built this</h2>
      <p style="margin:8px 0 16px;font-size:15px;line-height:1.55;color:#cdd6e6;">La Copa de LaFamilia supports <strong style="color:#ffffff;">Siembra</strong> — LaFamilia's 5-year anniversary campaign to grow the next generation of Latine founders and investors. Because when one of us gets in the room, we open the door for more of us.</p>
      ${button(SIEMBRA_URL, "🌱 Support Siembra", { bg: GOLD, color: "#3a2b00" })}
    </div>
  </td></tr>

  <tr><td style="padding:18px 28px 8px;font-family:${sans};">
    <div style="border-top:1px solid #eee;padding-top:22px;">
      <h2 style="margin:0;font-size:18px;font-weight:800;color:${INK};">🔗 Bring the Familia</h2>
      <p style="margin:8px 0 10px;font-size:15px;line-height:1.55;color:${MUTED};">Invite other Familia members with your personal link:</p>
      <p style="margin:0;font-size:14px;word-break:break-all;"><a href="${shareUrl}" target="_blank" style="color:${GREEN};font-weight:600;text-decoration:none;">${shareUrl}</a></p>
    </div>
  </td></tr>

  <tr><td style="padding:24px 28px 30px;font-family:${sans};text-align:center;">
    <div style="font-size:12px;color:${MUTED};">La Copa de LaFamilia 2026 · A community game, not betting. ⚽🌎</div>
  </td></tr>

</table>
</td></tr>
</table>
</body></html>`;
}
