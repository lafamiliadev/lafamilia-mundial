// Human-readable share-page handles, e.g. "Pilar Zárate" → "pilar".

export function slugify(input: string): string {
  return input
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "") // strip accents
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 24);
}

/** Route words a participant/crew slug must never collide with. */
export const RESERVED_SLUGS = new Set([
  "crew",
  "play",
  "admin",
  "api",
  "leaderboard",
  "insights",
  "done",
  "copa",
  "r",
  "about",
]);

/** Base slug from a display name (first name preferred for short, clean URLs). */
export function baseSlug(name: string): string {
  const first = slugify(name.split(/\s+/)[0] ?? "");
  return first || slugify(name) || "amigo";
}

/**
 * Resolve a unique slug given an async existence check. Tries the base, then
 * base-2, base-3, … so links stay clean and predictable. Reserved route words
 * are always treated as taken.
 */
export async function uniqueSlug(
  base: string,
  exists: (slug: string) => Promise<boolean>,
): Promise<string> {
  const taken = async (s: string) => RESERVED_SLUGS.has(s) || (await exists(s));
  if (!(await taken(base))) return base;
  for (let i = 2; i < 9999; i++) {
    const candidate = `${base}-${i}`;
    if (!(await taken(candidate))) return candidate;
  }
  return `${base}-${Date.now().toString(36)}`;
}
