// LaFamilia organizers / team. They can play, make picks, and share like anyone
// else — but they don't compete for prizes: no LaFamilia Honors, no top-3
// leaderboard prize, no "Bringing the Familia" invite prize. Eligibility lives
// here, decided by email, in one place. To exclude someone, add their email
// below (or set a comma-separated TEAM_EMAILS env var — merged with this list).
const TEAM_EMAILS: ReadonlySet<string> = new Set(
  [
    "hola@vcfamilia.com",
    // Add other organizer emails here, one per line:
    // "organizer@example.com",
    ...(process.env.TEAM_EMAILS ?? "").split(","),
  ]
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean),
);

/** True if this person is on the team (plays for fun, not for prizes). */
export function isTeamMember(p: { email?: string | null }): boolean {
  const email = p.email?.trim().toLowerCase();
  return !!email && TEAM_EMAILS.has(email);
}
