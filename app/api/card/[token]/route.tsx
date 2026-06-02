import { readFile } from "node:fs/promises";
import path from "node:path";
import { ImageResponse } from "next/og";
import { db } from "@/lib/db";
import { teamFlag, teamName } from "@/lib/teams";
import { playerName } from "@/lib/players";

export const runtime = "nodejs";

// Branded, downloadable "Prediction Card" — a 1080×1350 portrait image built to
// be SAVED and shared as an image (WhatsApp, IG Stories, LinkedIn, group chats).
// Warm, community-first, unmistakably LaFamilia — not a generic WC graphic.

const NAVY = "#051d40";
const CREAM = "#fdf6e8";
const GOLD = "#f5b301";
const CORAL = "#ff5a5f";

async function logoDataUri(): Promise<string | null> {
  try {
    const svg = await readFile(
      path.join(process.cwd(), "public", "lafamilia-logo-white.svg"),
      "utf8",
    );
    return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
  } catch {
    return null;
  }
}

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ token: string }> },
) {
  const { token } = await ctx.params;
  const repo = await db();
  const me = await repo.getByToken(token);
  const logo = await logoDataUri();

  const name = me?.name ?? "A LaFamilia member";
  const firstName = name.split(" ")[0];
  const p = me?.predictions;

  const picks = [
    { emoji: "🏆", label: "Champion", value: p ? `${teamFlag(p.champion)} ${teamName(p.champion)}` : "—" },
    { emoji: "🥈", label: "Runner-up", value: p ? `${teamFlag(p.runnerUp)} ${teamName(p.runnerUp)}` : "—" },
    { emoji: "🥅", label: "Golden Boot", value: p ? playerName(p.goldenBoot) : "—" },
    { emoji: "🔥", label: "Dark horse", value: p ? `${teamFlag(p.darkHorse)} ${teamName(p.darkHorse)}` : "—" },
  ];

  return new ImageResponse(
    (
      <div
        style={{
          width: "1080px",
          height: "1350px",
          display: "flex",
          flexDirection: "column",
          background: `radial-gradient(120% 60% at 50% 0%, #ffffff 0%, ${CREAM} 45%, #f6ead0 100%)`,
          fontFamily: "sans-serif",
          position: "relative",
        }}
      >
        {/* Playful corner balls */}
        <div style={{ position: "absolute", top: "-60px", right: "-60px", fontSize: "220px", opacity: 0.07 }}>⚽</div>
        <div style={{ position: "absolute", bottom: "300px", left: "-50px", fontSize: "180px", opacity: 0.06 }}>🌎</div>

        {/* Header — navy band with logo */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "18px",
            background: NAVY,
            padding: "54px 60px 46px",
          }}
        >
          {logo ? (
            <img src={logo} width={300} height={150} style={{ objectFit: "contain" }} alt="LaFamilia" />
          ) : (
            <div style={{ display: "flex", fontSize: "64px", fontWeight: 800, color: "#fff", letterSpacing: "-2px" }}>
              LaFamilia
            </div>
          )}
          <div
            style={{
              display: "flex",
              background: GOLD,
              color: NAVY,
              fontSize: "34px",
              fontWeight: 800,
              padding: "10px 28px",
              borderRadius: "999px",
            }}
          >
            MUNDIAL 2026 ⚽🌎
          </div>
        </div>

        {/* Body */}
        <div style={{ display: "flex", flexDirection: "column", padding: "50px 60px 0", flex: 1 }}>
          <div style={{ display: "flex", fontSize: "40px", color: "#8a7a55", fontWeight: 600 }}>
            {firstName}&apos;s World Cup bracket
          </div>

          {/* 2×2 picks */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: "26px", marginTop: "34px" }}>
            {picks.map((pick) => (
              <div
                key={pick.label}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  width: "440px",
                  background: "#ffffff",
                  border: "3px solid #efe4cb",
                  borderRadius: "30px",
                  padding: "30px 34px",
                  boxShadow: "0 10px 30px rgba(5,29,64,0.06)",
                }}
              >
                <div style={{ display: "flex", fontSize: "28px", color: "#9b8a63", fontWeight: 700 }}>
                  {pick.emoji} {pick.label}
                </div>
                <div style={{ display: "flex", fontSize: "52px", color: NAVY, fontWeight: 800, marginTop: "6px" }}>
                  {pick.value}
                </div>
              </div>
            ))}
          </div>

          {/* Callout */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              marginTop: "44px",
              background: CORAL,
              color: "#fff",
              fontSize: "52px",
              fontWeight: 800,
              padding: "30px",
              borderRadius: "26px",
              boxShadow: "0 12px 30px rgba(255,90,95,0.3)",
            }}
          >
            Can your bracket beat mine? ⚽
          </div>

          <div
            style={{
              display: "flex",
              justifyContent: "center",
              marginTop: "32px",
              fontSize: "32px",
              color: "#8a7a55",
              fontWeight: 600,
            }}
          >
            Make your picks in under 2 minutes ✨
          </div>
        </div>

        {/* Footer — Siembra */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "6px",
            background: NAVY,
            padding: "34px 60px 40px",
          }}
        >
          <div style={{ display: "flex", fontSize: "30px", color: GOLD, fontWeight: 700 }}>
            🌱 Sembrando con Siembra
          </div>
          <div style={{ display: "flex", fontSize: "24px", color: "#cdd6e6", textAlign: "center" }}>
            Planting seeds for the next generation of Latine founders & investors
          </div>
        </div>
      </div>
    ),
    { width: 1080, height: 1350, emoji: "twemoji" },
  );
}
