// The branded sender name inboxes show — never the internal "wc26" subdomain.
// Pure (no server-only) so it can be unit-tested.
export const FROM_NAME = "La Copa de LaFamilia";

/** Build the From header with the branded display name, keeping whatever sending
 * address is configured (handles both "Name <addr>" and a bare "addr"). So the
 * inbox always shows "La Copa de LaFamilia", regardless of how EMAIL_FROM is set. */
export function brandedFrom(rawFrom: string, name = FROM_NAME): string {
  const raw = rawFrom.trim();
  const match = raw.match(/<([^>]+)>/);
  const address = (match ? match[1] : raw).trim();
  return `${name} <${address}>`;
}
