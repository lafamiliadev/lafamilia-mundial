import { z } from "zod";

// Validated, typed environment access. Supabase + API keys are OPTIONAL so the
// app boots locally with zero config (it falls back to an in-memory dev store
// and the free OpenFootball provider). In production, set them all.

const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),

  // Public app URL (used for share links / OG cards).
  NEXT_PUBLIC_APP_URL: z.string().url().default("http://localhost:3000"),

  // Supabase (optional locally → in-memory dev store kicks in).
  NEXT_PUBLIC_SUPABASE_URL: z.string().url().optional(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1).optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1).optional(),

  // Football data provider.
  FOOTBALL_API_PROVIDER: z.enum(["api-football", "openfootball"]).default("openfootball"),
  FOOTBALL_API_KEY: z.string().optional(),

  // Admin + cron secrets.
  ADMIN_PASSWORD: z.string().min(1).default("lafamilia-admin"),
  CRON_SECRET: z.string().min(1).default("dev-cron-secret"),

  // Per-match Bonus Score Pick window-open emails. OFF by default so the cron
  // can be wired up without sending; flip to "true" to actually email members.
  SCORE_WINDOW_EMAILS_ENABLED: z.string().optional(),

  // Optional email (magic resume + milestone nudges).
  RESEND_API_KEY: z.string().optional(),
  // Must be a Resend-verified domain/address in production. We send from the
  // wc26 subdomain so the game's sending reputation stays isolated from
  // LaFamilia's main email domain. Override per-env with the EMAIL_FROM var.
  EMAIL_FROM: z.string().default("La Copa de LaFamilia <noreply@wc26.lafamiliafoundation.com>"),
});

const parsed = schema.safeParse(process.env);

if (!parsed.success) {
  console.error("❌ Invalid environment variables:", z.treeifyError(parsed.error));
  throw new Error("Invalid environment configuration. See .env.example.");
}

export const env = parsed.data;

/** True when a real Supabase project is configured (otherwise dev memory store). */
export const hasSupabase = Boolean(
  env.NEXT_PUBLIC_SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY,
);
