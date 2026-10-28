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

/**
 * A repeated UUID keeps its first position and latest accepted summary, including intentional absence.
 * UUID casing is immaterial; equal names never merge distinct identities. This is a render-time projection.
 */
export function uniqueSearchResults(
  pages: readonly DiscoveryPage[] | undefined,
): SearchResult[] {
  return [
    ...new Map(
      (pages ?? [])
        .flatMap(searchResults)
        .map((item) => [item.identity.id.toLowerCase(), item]),
    ).values(),
  ];
}
