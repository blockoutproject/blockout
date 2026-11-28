import {
  sportingEntityCardData,
  sportingEntityCardKey,
  type SportingEntityCardData,
} from "@/features/sporting/entity-card-data";
import { uniquePageRows } from "@/shared/query/infinite-pages";
import type { DiscoveryPage } from "../api/discovery-queries";

function searchResults(page: DiscoveryPage): SportingEntityCardData[] {
  if ("clubs" in page) {
    return page.clubs.map(({ club, city }) => ({
      kind: "club",
      identity: club,
      city,
    }));
  }
  if ("teams" in page) {
    return page.teams.map(sportingEntityCardData);
  }
  return page.pools.map(sportingEntityCardData);
}

/**
 * A repeated UUID keeps its first position and latest accepted summary, including intentional absence.
 * UUID casing is immaterial; equal names never merge distinct identities. This is a render-time projection.
 */
export function uniqueSearchResults(
  pages: readonly DiscoveryPage[] | undefined,
) {
  return uniquePageRows(
    (pages ?? []).flatMap(searchResults),
    sportingEntityCardKey,
  );
}
