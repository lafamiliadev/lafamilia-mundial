import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { env } from "./env";

// Lightweight single-admin auth: a signed, httpOnly cookie. The signing secret
// is ADMIN_PASSWORD, so rotating the password invalidates existing sessions.

export const ADMIN_COOKIE = "mundial_admin";

function sign(payload: string): string {
  return createHmac("sha256", env.ADMIN_PASSWORD).update(payload).digest("hex");
}

export function makeAdminToken(): string {
  const payload = "admin:v1";
  return `${payload}.${sign(payload)}`;
}

export function verifyAdminToken(token: string | undefined): boolean {
  if (!token) return false;
  const [payload, sig] = token.split(".");
  if (!payload || !sig) return false;
  const expected = sign(payload);
  if (sig.length !== expected.length) return false;
  try {
    return timingSafeEqual(Buffer.from(sig), Buffer.from(expected));
  } catch {
    return false;
  }
}

export function checkPassword(input: string): boolean {
  const a = Buffer.from(input);
  const b = Buffer.from(env.ADMIN_PASSWORD);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

/** For use inside admin server components / actions. */
export async function isAdmin(): Promise<boolean> {
  const store = await cookies();
  return verifyAdminToken(store.get(ADMIN_COOKIE)?.value);
}
