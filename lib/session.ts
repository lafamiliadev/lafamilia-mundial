import "server-only";
import { cookies } from "next/headers";
import { db } from "./db";
import type { Participant } from "./types";

// A lightweight "returning member" cookie. Holds the resume token so the home
// page, status bar, and /picks hub can greet members and deep-link their picks.
// httpOnly + lax: it's a convenience pointer, never a security boundary (the
// resume token is already the bearer for editing).
const COOKIE = "copa_token";
const MAX_AGE = 60 * 60 * 24 * 120; // ~120 days, covers the whole tournament

export async function setSessionToken(token: string): Promise<void> {
  const jar = await cookies();
  jar.set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: MAX_AGE,
    path: "/",
  });
}

export async function getSessionToken(): Promise<string | null> {
  const jar = await cookies();
  return jar.get(COOKIE)?.value ?? null;
}

/** The signed-in-ish member (by cookie), or null. Safe to call anywhere. */
export async function getSessionParticipant(): Promise<Participant | null> {
  try {
    const token = await getSessionToken();
    if (!token) return null;
    const repo = await db();
    return await repo.getByToken(token);
  } catch {
    return null;
  }
}
