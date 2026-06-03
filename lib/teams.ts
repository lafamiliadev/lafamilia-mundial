// Official 48 qualified teams for the FIFA World Cup 2026 (Canada · Mexico · USA).
// `fifaSeed` = the team's final-draw POT (1 = top seed), which also powers the
// deterministic Dark Horse rule. `isLatam` drives the "LatAm goes furthest" pick.
// Source of truth — `supabase/seed.sql` is generated from this file.

export type Confederation =
  | "UEFA"
  | "CONMEBOL"
  | "CONCACAF"
  | "AFC"
  | "CAF"
  | "OFC";

export type Team = {
  code: string; // FIFA 3-letter code, our primary key
  name: string;
  flag: string; // emoji
  confederation: Confederation;
  isLatam: boolean;
  /** Final-draw pot (1-4, 1 = top seed). Used by the Dark Horse rule. */
  fifaSeed: number;
  qualified: boolean;
};

export const TEAMS: Team[] = [
  // ── Hosts (CONCACAF) ──
  { code: "USA", name: "United States", flag: "🇺🇸", confederation: "CONCACAF", isLatam: false, fifaSeed: 1, qualified: true },
  { code: "MEX", name: "Mexico", flag: "🇲🇽", confederation: "CONCACAF", isLatam: true, fifaSeed: 1, qualified: true },
  { code: "CAN", name: "Canada", flag: "🇨🇦", confederation: "CONCACAF", isLatam: false, fifaSeed: 1, qualified: true },

  // ── CONMEBOL (6) ──
  { code: "ARG", name: "Argentina", flag: "🇦🇷", confederation: "CONMEBOL", isLatam: true, fifaSeed: 1, qualified: true },
  { code: "BRA", name: "Brazil", flag: "🇧🇷", confederation: "CONMEBOL", isLatam: true, fifaSeed: 1, qualified: true },
  { code: "COL", name: "Colombia", flag: "🇨🇴", confederation: "CONMEBOL", isLatam: true, fifaSeed: 2, qualified: true },
  { code: "URU", name: "Uruguay", flag: "🇺🇾", confederation: "CONMEBOL", isLatam: true, fifaSeed: 2, qualified: true },
  { code: "ECU", name: "Ecuador", flag: "🇪🇨", confederation: "CONMEBOL", isLatam: true, fifaSeed: 2, qualified: true },
  { code: "PAR", name: "Paraguay", flag: "🇵🇾", confederation: "CONMEBOL", isLatam: true, fifaSeed: 3, qualified: true },

  // ── CONCACAF non-host (3) ──
  { code: "PAN", name: "Panama", flag: "🇵🇦", confederation: "CONCACAF", isLatam: true, fifaSeed: 3, qualified: true },
  { code: "CUW", name: "Curaçao", flag: "🇨🇼", confederation: "CONCACAF", isLatam: false, fifaSeed: 4, qualified: true },
  { code: "HAI", name: "Haiti", flag: "🇭🇹", confederation: "CONCACAF", isLatam: false, fifaSeed: 4, qualified: true },

  // ── UEFA (16) ──
  { code: "ESP", name: "Spain", flag: "🇪🇸", confederation: "UEFA", isLatam: false, fifaSeed: 1, qualified: true },
  { code: "FRA", name: "France", flag: "🇫🇷", confederation: "UEFA", isLatam: false, fifaSeed: 1, qualified: true },
  { code: "ENG", name: "England", flag: "🏴󠁧󠁢󠁥󠁮󠁧󠁿", confederation: "UEFA", isLatam: false, fifaSeed: 1, qualified: true },
  { code: "POR", name: "Portugal", flag: "🇵🇹", confederation: "UEFA", isLatam: false, fifaSeed: 1, qualified: true },
  { code: "NED", name: "Netherlands", flag: "🇳🇱", confederation: "UEFA", isLatam: false, fifaSeed: 1, qualified: true },
  { code: "BEL", name: "Belgium", flag: "🇧🇪", confederation: "UEFA", isLatam: false, fifaSeed: 1, qualified: true },
  { code: "GER", name: "Germany", flag: "🇩🇪", confederation: "UEFA", isLatam: false, fifaSeed: 1, qualified: true },
  { code: "CRO", name: "Croatia", flag: "🇭🇷", confederation: "UEFA", isLatam: false, fifaSeed: 2, qualified: true },
  { code: "SUI", name: "Switzerland", flag: "🇨🇭", confederation: "UEFA", isLatam: false, fifaSeed: 2, qualified: true },
  { code: "AUT", name: "Austria", flag: "🇦🇹", confederation: "UEFA", isLatam: false, fifaSeed: 2, qualified: true },
  { code: "NOR", name: "Norway", flag: "🇳🇴", confederation: "UEFA", isLatam: false, fifaSeed: 3, qualified: true },
  { code: "SCO", name: "Scotland", flag: "🏴󠁧󠁢󠁳󠁣󠁴󠁿", confederation: "UEFA", isLatam: false, fifaSeed: 3, qualified: true },
  { code: "BIH", name: "Bosnia & Herzegovina", flag: "🇧🇦", confederation: "UEFA", isLatam: false, fifaSeed: 4, qualified: true },
  { code: "CZE", name: "Czechia", flag: "🇨🇿", confederation: "UEFA", isLatam: false, fifaSeed: 4, qualified: true },
  { code: "SWE", name: "Sweden", flag: "🇸🇪", confederation: "UEFA", isLatam: false, fifaSeed: 4, qualified: true },
  { code: "TUR", name: "Türkiye", flag: "🇹🇷", confederation: "UEFA", isLatam: false, fifaSeed: 4, qualified: true },

  // ── AFC (9) ──
  { code: "JPN", name: "Japan", flag: "🇯🇵", confederation: "AFC", isLatam: false, fifaSeed: 2, qualified: true },
  { code: "IRN", name: "Iran", flag: "🇮🇷", confederation: "AFC", isLatam: false, fifaSeed: 2, qualified: true },
  { code: "KOR", name: "South Korea", flag: "🇰🇷", confederation: "AFC", isLatam: false, fifaSeed: 2, qualified: true },
  { code: "AUS", name: "Australia", flag: "🇦🇺", confederation: "AFC", isLatam: false, fifaSeed: 2, qualified: true },
  { code: "QAT", name: "Qatar", flag: "🇶🇦", confederation: "AFC", isLatam: false, fifaSeed: 3, qualified: true },
  { code: "KSA", name: "Saudi Arabia", flag: "🇸🇦", confederation: "AFC", isLatam: false, fifaSeed: 3, qualified: true },
  { code: "UZB", name: "Uzbekistan", flag: "🇺🇿", confederation: "AFC", isLatam: false, fifaSeed: 3, qualified: true },
  { code: "JOR", name: "Jordan", flag: "🇯🇴", confederation: "AFC", isLatam: false, fifaSeed: 4, qualified: true },
  { code: "IRQ", name: "Iraq", flag: "🇮🇶", confederation: "AFC", isLatam: false, fifaSeed: 4, qualified: true },

  // ── CAF (10) ──
  { code: "MAR", name: "Morocco", flag: "🇲🇦", confederation: "CAF", isLatam: false, fifaSeed: 2, qualified: true },
  { code: "SEN", name: "Senegal", flag: "🇸🇳", confederation: "CAF", isLatam: false, fifaSeed: 2, qualified: true },
  { code: "EGY", name: "Egypt", flag: "🇪🇬", confederation: "CAF", isLatam: false, fifaSeed: 3, qualified: true },
  { code: "ALG", name: "Algeria", flag: "🇩🇿", confederation: "CAF", isLatam: false, fifaSeed: 3, qualified: true },
  { code: "TUN", name: "Tunisia", flag: "🇹🇳", confederation: "CAF", isLatam: false, fifaSeed: 4, qualified: true },
  { code: "CIV", name: "Ivory Coast", flag: "🇨🇮", confederation: "CAF", isLatam: false, fifaSeed: 3, qualified: true },
  { code: "RSA", name: "South Africa", flag: "🇿🇦", confederation: "CAF", isLatam: false, fifaSeed: 3, qualified: true },
  { code: "GHA", name: "Ghana", flag: "🇬🇭", confederation: "CAF", isLatam: false, fifaSeed: 4, qualified: true },
  { code: "CPV", name: "Cape Verde", flag: "🇨🇻", confederation: "CAF", isLatam: false, fifaSeed: 4, qualified: true },
  { code: "COD", name: "DR Congo", flag: "🇨🇩", confederation: "CAF", isLatam: false, fifaSeed: 4, qualified: true },

  // ── OFC (1) ──
  { code: "NZL", name: "New Zealand", flag: "🇳🇿", confederation: "OFC", isLatam: false, fifaSeed: 4, qualified: true },
];

// Teams that did NOT qualify for 2026. Never offered as a pick — kept only so
// that any predictions made before the field was finalized still display their
// real name/flag (a handful of early entries picked teams that missed out).
export const LEGACY_TEAMS: Team[] = [
  { code: "PER", name: "Peru", flag: "🇵🇪", confederation: "CONMEBOL", isLatam: true, fifaSeed: 4, qualified: false },
  { code: "CHI", name: "Chile", flag: "🇨🇱", confederation: "CONMEBOL", isLatam: true, fifaSeed: 4, qualified: false },
  { code: "BOL", name: "Bolivia", flag: "🇧🇴", confederation: "CONMEBOL", isLatam: true, fifaSeed: 4, qualified: false },
  { code: "VEN", name: "Venezuela", flag: "🇻🇪", confederation: "CONMEBOL", isLatam: true, fifaSeed: 4, qualified: false },
  { code: "CRC", name: "Costa Rica", flag: "🇨🇷", confederation: "CONCACAF", isLatam: true, fifaSeed: 4, qualified: false },
  { code: "HON", name: "Honduras", flag: "🇭🇳", confederation: "CONCACAF", isLatam: true, fifaSeed: 4, qualified: false },
  { code: "GUA", name: "Guatemala", flag: "🇬🇹", confederation: "CONCACAF", isLatam: true, fifaSeed: 4, qualified: false },
  { code: "SLV", name: "El Salvador", flag: "🇸🇻", confederation: "CONCACAF", isLatam: true, fifaSeed: 4, qualified: false },
  { code: "NCA", name: "Nicaragua", flag: "🇳🇮", confederation: "CONCACAF", isLatam: true, fifaSeed: 4, qualified: false },
  { code: "DOM", name: "Dominican Republic", flag: "🇩🇴", confederation: "CONCACAF", isLatam: true, fifaSeed: 4, qualified: false },
  { code: "ITA", name: "Italy", flag: "🇮🇹", confederation: "UEFA", isLatam: false, fifaSeed: 4, qualified: false },
  { code: "DEN", name: "Denmark", flag: "🇩🇰", confederation: "UEFA", isLatam: false, fifaSeed: 4, qualified: false },
  { code: "POL", name: "Poland", flag: "🇵🇱", confederation: "UEFA", isLatam: false, fifaSeed: 4, qualified: false },
  { code: "SRB", name: "Serbia", flag: "🇷🇸", confederation: "UEFA", isLatam: false, fifaSeed: 4, qualified: false },
  { code: "NGA", name: "Nigeria", flag: "🇳🇬", confederation: "CAF", isLatam: false, fifaSeed: 4, qualified: false },
];

// Display lookup includes legacy teams; pick options (TEAMS / LATAM_TEAMS) do not.
export const TEAM_BY_CODE: Record<string, Team> = Object.fromEntries(
  [...TEAMS, ...LEGACY_TEAMS].map((t) => [t.code, t]),
);

export const LATAM_TEAMS = TEAMS.filter((t) => t.isLatam);

/** Codes considered "top seeds" (Pot 1) — excluded from a valid Dark Horse pick. */
export const TOP_SEED_CODES = TEAMS.filter((t) => t.fifaSeed === 1).map((t) => t.code);

export function teamName(code: string | null | undefined): string {
  if (!code) return "—";
  return TEAM_BY_CODE[code]?.name ?? code;
}

export function teamFlag(code: string | null | undefined): string {
  if (!code) return "🏳️";
  return TEAM_BY_CODE[code]?.flag ?? "🏳️";
}

// ── Provider name resolution ─────────────────────────────────────────
// Football data providers (FIFA / API-Football) spell some nations differently.
// This alias map + accent-insensitive matching hardens name→code resolution so
// group standings and results map reliably. Source of truth, not hardcoded data.
export const TEAM_ALIASES: Record<string, string> = {
  "united states": "USA",
  "usa": "USA",
  "korea republic": "KOR",
  "south korea": "KOR",
  "ir iran": "IRN",
  "iran": "IRN",
  "iran islamic republic": "IRN",
  "cote d'ivoire": "CIV",
  "ivory coast": "CIV",
  "czech republic": "CZE",
  "czechia": "CZE",
  "turkiye": "TUR",
  "turkey": "TUR",
  "cabo verde": "CPV",
  "cape verde islands": "CPV",
  "congo dr": "COD",
  "dr congo": "COD",
  "democratic republic of the congo": "COD",
  "bosnia and herzegovina": "BIH",
  "saudi arabia": "KSA",
};

function normalizeName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, ""); // strip accents
}

const NAME_INDEX: Record<string, string> = (() => {
  const idx: Record<string, string> = {};
  for (const t of [...TEAMS, ...LEGACY_TEAMS]) idx[normalizeName(t.name)] = t.code;
  for (const [alias, code] of Object.entries(TEAM_ALIASES)) idx[normalizeName(alias)] = code;
  return idx;
})();

/** Resolve a provider-supplied team name (or 3-letter code) to our team code. */
export function resolveTeamCode(name: string | null | undefined): string | null {
  if (!name) return null;
  const raw = name.trim();
  if (TEAM_BY_CODE[raw.toUpperCase()]) return raw.toUpperCase(); // already a code
  return NAME_INDEX[normalizeName(raw)] ?? null;
}
