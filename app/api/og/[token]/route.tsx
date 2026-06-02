import { ImageResponse } from "next/og";
import { db } from "@/lib/db";
import { teamFlag, teamName } from "@/lib/teams";
import { playerName } from "@/lib/players";

export const runtime = "nodejs";

// Personalized share card — this is the WhatsApp preview that drives the viral
// loop. Rendered on demand for each resume token.
export async function GET(
  _req: Request,
  ctx: { params: Promise<{ token: string }> },
) {
  const { token } = await ctx.params;
  const repo = await db();
  const me = await repo.getByToken(token);

  const name = me?.name ?? "A LaFamilia member";
  const champ = me?.predictions.champion ?? null;

  return new ImageResponse(
    (
      <div
        style={{
          width: "1200px",
          height: "630px",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "64px",
          background: "linear-gradient(160deg, #0b6b3a 0%, #084a28 60%, #06371e 100%)",
          color: "white",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "16px", fontSize: "32px", fontWeight: 700 }}>
          <span>⚽</span>
          <span style={{ opacity: 0.85 }}>La Copa de LaFamilia 2026</span>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          <span style={{ fontSize: "30px", opacity: 0.8 }}>{name}&apos;s pick to win it all</span>
          <span style={{ fontSize: "92px", fontWeight: 800, lineHeight: 1.05 }}>
            {teamFlag(champ)} {teamName(champ)}
          </span>
          {me && (
            <span style={{ fontSize: "30px", opacity: 0.85, marginTop: "12px" }}>
              🔥 Dark horse {teamFlag(me.predictions.darkHorse)} {teamName(me.predictions.darkHorse)} ·
              🥅 {playerName(me.predictions.goldenBoot)}
            </span>
          )}
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            fontSize: "30px",
            fontWeight: 700,
          }}
        >
          <span style={{ color: "#f5b301" }}>Beat my bracket →</span>
          <span style={{ opacity: 0.7 }}>Takes under 2 minutes</span>
        </div>
      </div>
    ),
    { width: 1200, height: 630, emoji: "twemoji" },
  );
}
