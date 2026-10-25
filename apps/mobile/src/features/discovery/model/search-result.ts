import type {
  SportingIdentityResponse,
  SportingClassificationResponse,
  SportingSeasonResponse,
} from "../../../../.generated/schemas/index.zod";
import type { DiscoveryPage } from "../api/discovery-queries";

/** Available public summary slots; missing context never produces invented identity or classification. */
export interface SearchResult {
  kind: "club" | "team" | "pool";
  identity: SportingIdentityResponse;
  city?: string;
  subtitle?: string;
  classification?: SportingClassificationResponse;
  season?: SportingSeasonResponse;
}

/** Maps current generated summaries to available presentation slots without storing a second result collection. */
export function searchResults(page: DiscoveryPage): SearchResult[] {
  if ("clubs" in page)
    return page.clubs.map(({ club, city }) => ({
      kind: "club",
      identity: club,
      city,
    }));
  if ("teams" in page)
    return page.teams.map(({ team, club, season, classification }) => ({
      kind: "team",
      identity: team,
      subtitle: club?.name,
      season,
      classification,
    }));
  return page.pools.map(
    ({ pool, season, classification, competitionName, phaseName }) => ({
      kind: "pool",
      identity: pool,
      subtitle:
        [competitionName, phaseName].filter(Boolean).join(" · ") || undefined,
      season,
      classification,
    }),
  );
}
