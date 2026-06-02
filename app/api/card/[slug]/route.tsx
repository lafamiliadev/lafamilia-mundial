import { readFile } from "node:fs/promises";
import path from "node:path";
import { ImageResponse } from "next/og";
import QRCode from "qrcode";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { TEAM_BY_CODE, teamFlag, teamName } from "@/lib/teams";
import { playerName } from "@/lib/players";

export const runtime = "nodejs";

// La Copa de LaFamilia 2026 — the COLLECTIBLE prediction card. A standalone,
// premium digital trading card (think FIFA Ultimate Team × Amex Centurion ×
// limited-edition World Cup collectible). Deep emerald + ivory + gold foil.
// No fundraising, no marketing copy — just an artifact worth saving + sharing.

const EMERALD = "#0b3a2c";
const EMERALD_DEEP = "#072018";
const CREAM = "#f5edda";
const SAND = "#cdbb90";
const GOLD = "#c8a24a";
const GOLD_LT = "#e6cd82";

async function asset(file: string): Promise<string | null> {
  try {
    const svg = await readFile(path.join(process.cwd(), "public", file), "utf8");
    return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
  } catch {
    return null;
  }
}

// One collectible badge, derived from the member's profile.
function deriveBadge(order: number, champSeed: number): { emoji: string; label: string } {
  if (order >= 0 && order < 25) return { emoji: "🏆", label: "Founding Predictor" };
  if (champSeed >= 3) return { emoji: "🔥", label: "Bold Pick" };
  return { emoji: "⚽", label: "Early Entry" };
}

export async function GET(_req: Request, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params;
  const repo = await db();
  const [me, all, logo] = await Promise.all([
    repo.getBySlug(slug),
    repo.listParticipants(),
    asset("lafamilia-logo-gold.svg"),
  ]);

  const name = me?.name ?? "A LaFamilia Member";
  const p = me?.predictions;

  const championCode = p?.champion ?? null;
  const champName = (championCode ? teamName(championCode) : "—").toUpperCase();
  const champSeed = championCode ? (TEAM_BY_CODE[championCode]?.fifaSeed ?? 4) : 4;
  const order = me ? all.findIndex((x) => x.slug === me.slug) : -1;
  const badge = deriveBadge(order, champSeed);

  // Hero type scales to the country name so it always reads as the hero.
  const heroSize =
    champName.length <= 7 ? 176 : champName.length <= 10 ? 144 : champName.length <= 14 ? 104 : 82;

  const referralUrl = `${env.NEXT_PUBLIC_APP_URL}/copa/${me?.slug ?? ""}`;
  const qr = await QRCode.toDataURL(referralUrl, {
    margin: 1,
    width: 320,
    errorCorrectionLevel: "M",
    color: { dark: EMERALD, light: CREAM },
  });

  const strip = [
    { label: "Runner-up", value: p ? `${teamFlag(p.runnerUp)} ${teamName(p.runnerUp)}` : "—" },
    { label: "Golden Boot", value: p ? playerName(p.goldenBoot) : "—" },
    { label: "Dark Horse", value: p ? `${teamFlag(p.darkHorse)} ${teamName(p.darkHorse)}` : "—" },
  ];

  return new ImageResponse(
    (
      <div
        style={{
          width: "1080px",
          height: "1350px",
          display: "flex",
          position: "relative",
          fontFamily: "sans-serif",
          background: `radial-gradient(120% 70% at 50% 0%, ${EMERALD} 0%, ${EMERALD_DEEP} 78%)`,
        }}
      >
        {/* Gold foil double frame */}
        <div style={{ position: "absolute", top: "30px", left: "30px", right: "30px", bottom: "30px", border: `3px solid ${GOLD}`, borderRadius: "30px" }} />
        <div style={{ position: "absolute", top: "40px", left: "40px", right: "40px", bottom: "40px", border: `1px solid rgba(230,205,130,0.45)`, borderRadius: "22px" }} />

        {/* Content */}
        <div
          style={{
            position: "relative",
            display: "flex",
            flexDirection: "column",
            width: "100%",
            height: "100%",
            padding: "76px 72px",
          }}
        >
          {/* ── Header ── */}
          <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                {logo ? (
                  <img src={logo} width={150} height={60} style={{ objectFit: "contain" }} alt="LaFamilia" />
                ) : (
                  <div style={{ display: "flex", fontSize: "40px", fontWeight: 800, color: GOLD }}>LaFamilia</div>
                )}
              </div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  border: `1.5px solid ${GOLD}`,
                  background: "rgba(200,162,74,0.10)",
                  borderRadius: "999px",
                  padding: "10px 20px",
                }}
              >
                <span style={{ fontSize: "26px" }}>{badge.emoji}</span>
                <span style={{ display: "flex", fontSize: "20px", fontWeight: 700, color: GOLD_LT, letterSpacing: "1px", textTransform: "uppercase" }}>
                  {badge.label}
                </span>
              </div>
            </div>
            <div style={{ display: "flex", fontSize: "24px", fontWeight: 700, color: SAND, letterSpacing: "7px" }}>
              LA COPA DE LAFAMILIA · 2026
            </div>
            <div style={{ display: "flex", height: "2px", background: `linear-gradient(90deg, ${GOLD} 0%, rgba(200,162,74,0) 100%)` }} />
          </div>

          {/* ── Champion hero ── */}
          <div
            style={{
              position: "relative",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              flex: 1,
            }}
          >
            {/* Subtle large flag for depth */}
            <div style={{ position: "absolute", display: "flex", fontSize: "440px", opacity: 0.08 }}>
              {teamFlag(championCode)}
            </div>

            <div style={{ display: "flex", fontSize: "26px", fontWeight: 700, color: SAND, letterSpacing: "4px" }}>
              {name.toUpperCase()}&apos;S PICKS
            </div>
            <div style={{ display: "flex", marginTop: "26px", fontSize: "30px", fontWeight: 800, color: GOLD, letterSpacing: "8px" }}>
              CHAMPION
            </div>
            <div style={{ display: "flex", fontSize: `${heroSize}px`, fontWeight: 900, color: CREAM, letterSpacing: "2px", lineHeight: 1, marginTop: "6px" }}>
              {champName}
            </div>
            <div style={{ display: "flex", marginTop: "22px", fontSize: "108px", lineHeight: 1 }}>
              {teamFlag(championCode)}
            </div>

            {/* Compact prediction strip */}
            <div
              style={{
                display: "flex",
                marginTop: "48px",
                borderTop: `1px solid rgba(205,187,144,0.35)`,
                borderBottom: `1px solid rgba(205,187,144,0.35)`,
                paddingTop: "24px",
                paddingBottom: "24px",
              }}
            >
              {strip.map((s, i) => (
                <div
                  key={s.label}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: "8px",
                    width: "300px",
                    borderLeft: i === 0 ? "none" : `1px solid rgba(205,187,144,0.30)`,
                  }}
                >
                  <span style={{ display: "flex", fontSize: "20px", fontWeight: 700, color: GOLD, letterSpacing: "2px", textTransform: "uppercase" }}>
                    {s.label}
                  </span>
                  <span style={{ display: "flex", fontSize: "34px", fontWeight: 800, color: CREAM }}>{s.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* ── Bottom: challenge + QR ── */}
          <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
              <div style={{ display: "flex", flexDirection: "column", fontSize: "54px", fontWeight: 800, color: CREAM, lineHeight: 1.05 }}>
                <span>Can you beat</span>
                <span>my bracket?</span>
              </div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  alignSelf: "flex-start",
                  border: `1.5px solid ${GOLD}`,
                  borderRadius: "999px",
                  padding: "12px 26px",
                  fontSize: "22px",
                  fontWeight: 800,
                  color: GOLD_LT,
                  letterSpacing: "1px",
                }}
              >
                Make Your Picks ⚽
              </div>
              <span style={{ display: "flex", fontSize: "18px", fontWeight: 600, color: SAND, letterSpacing: "1px", opacity: 0.8 }}>
                Built by LaFamilia
              </span>
            </div>

            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "10px" }}>
              <div style={{ display: "flex", background: CREAM, padding: "14px", borderRadius: "20px", border: `2px solid ${GOLD}` }}>
                <img src={qr} width={188} height={188} alt="Scan to play" />
              </div>
              <span style={{ display: "flex", fontSize: "17px", fontWeight: 700, color: GOLD, letterSpacing: "3px" }}>
                SCAN TO PLAY
              </span>
            </div>
          </div>
        </div>
      </div>
    ),
    { width: 1080, height: 1350, emoji: "twemoji" },
  );
}
