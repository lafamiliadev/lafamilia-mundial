import { readFile } from "node:fs/promises";
import path from "node:path";
import { ImageResponse } from "next/og";
import QRCode from "qrcode";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { cardTheme, darken, withAlpha } from "@/lib/card-theme";
import { TEAM_BY_CODE, teamFlag, teamName } from "@/lib/teams";
import { playerName } from "@/lib/players";

export const runtime = "nodejs";

// La Copa de LaFamilia 2026 — the COLLECTIBLE prediction card. Fully dynamic per
// member: their actual picks, a personalized title, and a "team edition" palette
// that shifts to their CHAMPION's flag identity (Brazil → green, Argentina →
// blue, …). Premium emerald/ivory/gold-foil structure kept across the series.

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
  const theme = cardTheme(championCode);

  const heroSize =
    champName.length <= 7 ? 168 : champName.length <= 10 ? 136 : champName.length <= 14 ? 100 : 80;

  const referralUrl = `${env.NEXT_PUBLIC_APP_URL}/copa/${me?.slug ?? ""}`;
  const qr = await QRCode.toDataURL(referralUrl, {
    margin: 1,
    width: 320,
    errorCorrectionLevel: "M",
    color: { dark: theme.base, light: CREAM },
  });

  // Every supporting pick (champion is the hero above).
  const goals = p?.finalTotalGoals;
  const picks = [
    { label: "Rooting for", value: me?.rootingCountry ? `${teamFlag(me.rootingCountry)} ${teamName(me.rootingCountry)}` : "—" },
    { label: "Runner-up", value: p ? `${teamFlag(p.runnerUp)} ${teamName(p.runnerUp)}` : "—" },
    { label: "Golden Boot", value: p ? playerName(p.goldenBoot) : "—" },
    { label: "Dark Horse", value: p ? `${teamFlag(p.darkHorse)} ${teamName(p.darkHorse)}` : "—" },
    { label: "LatAm Furthest", value: p ? `${teamFlag(p.latamFurthest)} ${teamName(p.latamFurthest)}` : "—" },
    { label: "Final Goals", value: goals != null ? String(goals) : "—" },
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
          background: `radial-gradient(125% 75% at 50% 0%, ${theme.base} 0%, ${darken(theme.base, 0.55)} 82%)`,
        }}
      >
        {/* Team-colored stadium glow */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: "560px",
            background: `radial-gradient(60% 100% at 50% 0%, ${withAlpha(theme.accent, 0.22)} 0%, rgba(0,0,0,0) 70%)`,
          }}
        />

        {/* Gold foil double frame */}
        <div style={{ position: "absolute", top: "30px", left: "30px", right: "30px", bottom: "30px", border: `3px solid ${GOLD}`, borderRadius: "30px" }} />
        <div style={{ position: "absolute", top: "40px", left: "40px", right: "40px", bottom: "40px", border: `1px solid ${withAlpha(GOLD_LT, 0.45)}`, borderRadius: "22px" }} />

        <div style={{ position: "relative", display: "flex", flexDirection: "column", width: "100%", height: "100%", padding: "66px 68px" }}>
          {/* ── Header ── */}
          <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              {logo ? (
                <img src={logo} width={216} height={108} style={{ objectFit: "contain" }} alt="LaFamilia" />
              ) : (
                <div style={{ display: "flex", fontSize: "52px", fontWeight: 800, color: GOLD }}>LaFamilia</div>
              )}
              <div style={{ display: "flex", alignItems: "center", gap: "10px", border: `1.5px solid ${theme.accent}`, background: withAlpha(theme.accent, 0.12), borderRadius: "999px", padding: "9px 18px" }}>
                <span style={{ fontSize: "24px" }}>{badge.emoji}</span>
                <span style={{ display: "flex", fontSize: "19px", fontWeight: 700, color: CREAM, letterSpacing: "1px", textTransform: "uppercase" }}>
                  {badge.label}
                </span>
              </div>
            </div>
            <div style={{ display: "flex", fontSize: "22px", fontWeight: 700, color: SAND, letterSpacing: "6px" }}>
              LA COPA DE LAFAMILIA · 2026
            </div>
            <div style={{ display: "flex", fontSize: "38px", fontWeight: 800, color: CREAM, letterSpacing: "1px" }}>
              {name}&apos;s predictions
            </div>
            <div style={{ display: "flex", height: "2px", background: `linear-gradient(90deg, ${theme.accent} 0%, rgba(0,0,0,0) 100%)` }} />
          </div>

          {/* ── Champion hero ── */}
          <div style={{ position: "relative", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", flex: 1 }}>
            <div style={{ position: "absolute", display: "flex", fontSize: "400px", opacity: 0.09 }}>{teamFlag(championCode)}</div>

            <div style={{ display: "flex", fontSize: "27px", fontWeight: 800, color: theme.accent, letterSpacing: "7px" }}>
              🏆 PICK TO WIN IT ALL
            </div>
            <div style={{ display: "flex", fontSize: `${heroSize}px`, fontWeight: 900, color: CREAM, letterSpacing: "2px", lineHeight: 1, marginTop: "8px" }}>
              {champName}
            </div>
            <div style={{ display: "flex", marginTop: "20px", fontSize: "96px", lineHeight: 1 }}>{teamFlag(championCode)}</div>
          </div>

          {/* ── All supporting picks (3 × 2) ── */}
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              borderTop: `1px solid ${withAlpha(SAND, 0.35)}`,
              borderBottom: `1px solid ${withAlpha(SAND, 0.35)}`,
              paddingTop: "22px",
              paddingBottom: "22px",
            }}
          >
            {picks.map((s) => (
              <div key={s.label} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "6px", width: "314px", padding: "10px 4px" }}>
                <span style={{ display: "flex", fontSize: "18px", fontWeight: 700, color: GOLD, letterSpacing: "2px", textTransform: "uppercase" }}>
                  {s.label}
                </span>
                <span style={{ display: "flex", fontSize: "30px", fontWeight: 800, color: CREAM }}>{s.value}</span>
              </div>
            ))}
          </div>

          {/* ── Challenge + QR ── */}
          <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginTop: "34px" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div style={{ display: "flex", flexDirection: "column", fontSize: "50px", fontWeight: 800, color: CREAM, lineHeight: 1.05 }}>
                <span>Can you beat</span>
                <span>my bracket?</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", alignSelf: "flex-start", border: `1.5px solid ${GOLD}`, borderRadius: "999px", padding: "11px 24px", fontSize: "21px", fontWeight: 800, color: GOLD_LT, letterSpacing: "1px" }}>
                Make Your Picks ⚽
              </div>
              <span style={{ display: "flex", fontSize: "17px", fontWeight: 600, color: SAND, letterSpacing: "1px", opacity: 0.8 }}>
                Built by LaFamilia
              </span>
            </div>

            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "9px" }}>
              <div style={{ display: "flex", background: CREAM, padding: "13px", borderRadius: "18px", border: `2px solid ${GOLD}` }}>
                <img src={qr} width={176} height={176} alt="Scan to play" />
              </div>
              <span style={{ display: "flex", fontSize: "16px", fontWeight: 700, color: theme.accent, letterSpacing: "3px" }}>
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
