// Static team reference data for LaFamilia Mundial 2026.
// `qualified` reflects the 2026 finalist field; `fifa_seed` (1 = strongest pot)
// powers the deterministic Dark Horse rule. The LatAm set drives Step 6.
// This is the seed source of truth — `supabase/seed.sql` is generated to match.

export type Confederation =
  | "UEFA"
  | "CONMEBOL"
  | "CONCACAF"
  | "AFC"
  | "CAF"
  | "OFC";

export type Team = {
  code: string; // ISO-ish 3-letter code, our primary key
  name: string;
  flag: string; // emoji
  confederation: Confederation;
  isLatam: boolean;
  /** FIFA strength tier 1-4 (1 = top seed). Used by the Dark Horse rule. */
  fifaSeed: number;
  qualified: boolean;
};

export const TEAMS: Team[] = [
  // Hosts
  { code: "USA", name: "United States", flag: "🇺🇸", confederation: "CONCACAF", isLatam: false, fifaSeed: 2, qualified: true },
  { code: "CAN", name: "Canada", flag: "🇨🇦", confederation: "CONCACAF", isLatam: false, fifaSeed: 3, qualified: true },
  { code: "MEX", name: "Mexico", flag: "🇲🇽", confederation: "CONCACAF", isLatam: true, fifaSeed: 2, qualified: true },

  // CONMEBOL (South America)
  { code: "ARG", name: "Argentina", flag: "🇦🇷", confederation: "CONMEBOL", isLatam: true, fifaSeed: 1, qualified: true },
  { code: "BRA", name: "Brazil", flag: "🇧🇷", confederation: "CONMEBOL", isLatam: true, fifaSeed: 1, qualified: true },
  { code: "URU", name: "Uruguay", flag: "🇺🇾", confederation: "CONMEBOL", isLatam: true, fifaSeed: 2, qualified: true },
  { code: "COL", name: "Colombia", flag: "🇨🇴", confederation: "CONMEBOL", isLatam: true, fifaSeed: 2, qualified: true },
  { code: "ECU", name: "Ecuador", flag: "🇪🇨", confederation: "CONMEBOL", isLatam: true, fifaSeed: 3, qualified: true },
  { code: "PAR", name: "Paraguay", flag: "🇵🇾", confederation: "CONMEBOL", isLatam: true, fifaSeed: 3, qualified: true },
  { code: "PER", name: "Peru", flag: "🇵🇪", confederation: "CONMEBOL", isLatam: true, fifaSeed: 4, qualified: false },
  { code: "CHI", name: "Chile", flag: "🇨🇱", confederation: "CONMEBOL", isLatam: true, fifaSeed: 4, qualified: false },
  { code: "BOL", name: "Bolivia", flag: "🇧🇴", confederation: "CONMEBOL", isLatam: true, fifaSeed: 4, qualified: false },
  { code: "VEN", name: "Venezuela", flag: "🇻🇪", confederation: "CONMEBOL", isLatam: true, fifaSeed: 4, qualified: false },

  // CONCACAF (rest of LatAm + region)
  { code: "CRC", name: "Costa Rica", flag: "🇨🇷", confederation: "CONCACAF", isLatam: true, fifaSeed: 3, qualified: false },
  { code: "PAN", name: "Panama", flag: "🇵🇦", confederation: "CONCACAF", isLatam: true, fifaSeed: 3, qualified: false },
  { code: "HON", name: "Honduras", flag: "🇭🇳", confederation: "CONCACAF", isLatam: true, fifaSeed: 4, qualified: false },
  { code: "GUA", name: "Guatemala", flag: "🇬🇹", confederation: "CONCACAF", isLatam: true, fifaSeed: 4, qualified: false },
  { code: "SLV", name: "El Salvador", flag: "🇸🇻", confederation: "CONCACAF", isLatam: true, fifaSeed: 4, qualified: false },
  { code: "NCA", name: "Nicaragua", flag: "🇳🇮", confederation: "CONCACAF", isLatam: true, fifaSeed: 4, qualified: false },
  { code: "DOM", name: "Dominican Republic", flag: "🇩🇴", confederation: "CONCACAF", isLatam: true, fifaSeed: 4, qualified: false },

  // UEFA (Europe)
  { code: "FRA", name: "France", flag: "🇫🇷", confederation: "UEFA", isLatam: false, fifaSeed: 1, qualified: true },
  { code: "ENG", name: "England", flag: "🏴󠁧󠁢󠁥󠁮󠁧󠁿", confederation: "UEFA", isLatam: false, fifaSeed: 1, qualified: true },
  { code: "ESP", name: "Spain", flag: "🇪🇸", confederation: "UEFA", isLatam: false, fifaSeed: 1, qualified: true },
  { code: "POR", name: "Portugal", flag: "🇵🇹", confederation: "UEFA", isLatam: false, fifaSeed: 1, qualified: true },
  { code: "GER", name: "Germany", flag: "🇩🇪", confederation: "UEFA", isLatam: false, fifaSeed: 1, qualified: true },
  { code: "NED", name: "Netherlands", flag: "🇳🇱", confederation: "UEFA", isLatam: false, fifaSeed: 1, qualified: true },
  { code: "ITA", name: "Italy", flag: "🇮🇹", confederation: "UEFA", isLatam: false, fifaSeed: 2, qualified: true },
  { code: "BEL", name: "Belgium", flag: "🇧🇪", confederation: "UEFA", isLatam: false, fifaSeed: 2, qualified: true },
  { code: "CRO", name: "Croatia", flag: "🇭🇷", confederation: "UEFA", isLatam: false, fifaSeed: 2, qualified: true },
  { code: "SUI", name: "Switzerland", flag: "🇨🇭", confederation: "UEFA", isLatam: false, fifaSeed: 2, qualified: true },
  { code: "DEN", name: "Denmark", flag: "🇩🇰", confederation: "UEFA", isLatam: false, fifaSeed: 3, qualified: true },
  { code: "AUT", name: "Austria", flag: "🇦🇹", confederation: "UEFA", isLatam: false, fifaSeed: 3, qualified: true },
  { code: "POL", name: "Poland", flag: "🇵🇱", confederation: "UEFA", isLatam: false, fifaSeed: 3, qualified: false },
  { code: "SRB", name: "Serbia", flag: "🇷🇸", confederation: "UEFA", isLatam: false, fifaSeed: 3, qualified: false },
  { code: "TUR", name: "Türkiye", flag: "🇹🇷", confederation: "UEFA", isLatam: false, fifaSeed: 3, qualified: false },
  { code: "NOR", name: "Norway", flag: "🇳🇴", confederation: "UEFA", isLatam: false, fifaSeed: 3, qualified: false },

  // AFC (Asia)
  { code: "JPN", name: "Japan", flag: "🇯🇵", confederation: "AFC", isLatam: false, fifaSeed: 2, qualified: true },
  { code: "KOR", name: "South Korea", flag: "🇰🇷", confederation: "AFC", isLatam: false, fifaSeed: 3, qualified: true },
  { code: "IRN", name: "Iran", flag: "🇮🇷", confederation: "AFC", isLatam: false, fifaSeed: 3, qualified: true },
  { code: "AUS", name: "Australia", flag: "🇦🇺", confederation: "AFC", isLatam: false, fifaSeed: 3, qualified: true },
  { code: "KSA", name: "Saudi Arabia", flag: "🇸🇦", confederation: "AFC", isLatam: false, fifaSeed: 4, qualified: true },
  { code: "QAT", name: "Qatar", flag: "🇶🇦", confederation: "AFC", isLatam: false, fifaSeed: 4, qualified: true },

  // CAF (Africa)
  { code: "MAR", name: "Morocco", flag: "🇲🇦", confederation: "CAF", isLatam: false, fifaSeed: 2, qualified: true },
  { code: "SEN", name: "Senegal", flag: "🇸🇳", confederation: "CAF", isLatam: false, fifaSeed: 3, qualified: true },
  { code: "NGA", name: "Nigeria", flag: "🇳🇬", confederation: "CAF", isLatam: false, fifaSeed: 3, qualified: false },
  { code: "EGY", name: "Egypt", flag: "🇪🇬", confederation: "CAF", isLatam: false, fifaSeed: 3, qualified: true },
  { code: "ALG", name: "Algeria", flag: "🇩🇿", confederation: "CAF", isLatam: false, fifaSeed: 3, qualified: true },
  { code: "CIV", name: "Ivory Coast", flag: "🇨🇮", confederation: "CAF", isLatam: false, fifaSeed: 3, qualified: true },
  { code: "TUN", name: "Tunisia", flag: "🇹🇳", confederation: "CAF", isLatam: false, fifaSeed: 4, qualified: true },
  { code: "GHA", name: "Ghana", flag: "🇬🇭", confederation: "CAF", isLatam: false, fifaSeed: 4, qualified: true },

  // OFC (Oceania)
  { code: "NZL", name: "New Zealand", flag: "🇳🇿", confederation: "OFC", isLatam: false, fifaSeed: 4, qualified: true },
];

export const TEAM_BY_CODE: Record<string, Team> = Object.fromEntries(
  TEAMS.map((t) => [t.code, t]),
);

export const LATAM_TEAMS = TEAMS.filter((t) => t.isLatam);

/** Codes considered "top seeds" (excluded from a valid Dark Horse pick). */
export const TOP_SEED_CODES = TEAMS.filter((t) => t.fifaSeed === 1).map((t) => t.code);

export function teamName(code: string | null | undefined): string {
  if (!code) return "—";
  return TEAM_BY_CODE[code]?.name ?? code;
}

export function teamFlag(code: string | null | undefined): string {
  if (!code) return "🏳️";
  return TEAM_BY_CODE[code]?.flag ?? "🏳️";
}
