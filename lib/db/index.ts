import "server-only";
import { hasSupabase } from "../env";
import { memoryRepo } from "./memory";
import type { Repo } from "./repo";

// Picks the production (Supabase) repo when configured, else the dev store.
// The supabase module is imported lazily so the dev path never needs the keys.
let cached: Repo | null = null;

export async function db(): Promise<Repo> {
  if (cached) return cached;
  if (hasSupabase) {
    const { supabaseRepo } = await import("./supabase");
    cached = supabaseRepo;
  } else {
    cached = memoryRepo;
  }
  return cached;
}

export type { Repo } from "./repo";
