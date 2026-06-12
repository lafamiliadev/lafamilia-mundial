import { env } from "../env";
import { ApiFootballProvider } from "./api-football";
import { OpenFootballProvider } from "./openfootball";
import type { FootballProvider } from "./provider";

// Selects the active provider from FOOTBALL_API_PROVIDER. Defaults to the free
// OpenFootball provider so the app works with zero configuration.
export function getProvider(): FootballProvider {
  if (env.FOOTBALL_API_PROVIDER === "api-football" && env.FOOTBALL_API_KEY) {
    return new ApiFootballProvider();
  }
  return new OpenFootballProvider();
}

export type {
  FootballProvider,
  ProviderMatchStatus,
  ProviderScore,
  ProviderStatus,
} from "./provider";
