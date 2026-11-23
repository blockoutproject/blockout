import type {
  CollectionProviderEnum,
  CollectionResultSourceResponse,
} from "../../../../.generated/schemas/index.zod";
import type { CollectionResultCriteria } from "../api/collection-queries";
import type { SourceFilters } from "./source-catalogue";
import type { ClubCollectionFamily } from "./collection-club-family";
import type { BilanSearchCriteria } from "./collection-route-params";

type SourceAttribution = Pick<
  CollectionResultSourceResponse,
  "id" | "packId" | "poolId" | "phaseReference"
>;

export function collectionProviderHref(
  seasonId: string,
  provider: CollectionProviderEnum,
  sourceFilters?: SourceFilters,
) {
  return {
    pathname: "/collection/[seasonId]/controls/[provider]" as const,
    params: {
      seasonId,
      provider,
      // DismissTo updates the retained route. Empty values clear its applied filters.
      ...(sourceFilters && {
        tab: "sources",
        status: sourceFilters.status ?? "",
        scope: sourceFilters.scope ?? "",
      }),
    },
  };
}

export function collectionBilanHref(
  seasonId: string,
  provider: CollectionProviderEnum,
  criteria?: CollectionResultCriteria,
) {
  return {
    pathname: "/collection/[seasonId]/controls/[provider]/bilan" as const,
    params: {
      seasonId,
      provider,
      ...(criteria && {
        ...bilanSearchParams(criteria),
        sourceId: criteria.sourceId ?? "",
        stage: criteria.stage ?? "",
      }),
    },
  };
}

export function collectionClubBilanHref(
  family: ClubCollectionFamily,
  criteria?: BilanSearchCriteria,
) {
  return {
    pathname: "/collection/clubs/[family]/bilan" as const,
    params: { family, ...(criteria && bilanSearchParams(criteria)) },
  };
}

/** DismissTo updates the retained Bilan. Empty values clear its criteria. */
function bilanSearchParams({ query, status }: BilanSearchCriteria) {
  return { query: query ?? "", status: status ?? "" };
}

/** A source route carries only the established binding and its optional catalogue focus. */
export function collectionSourceHref(
  seasonId: string,
  source: SourceAttribution,
) {
  const { id: sourceId, packId, poolId, phaseReference } = source;
  return {
    pathname: "/collection/[seasonId]/sources/[sourceId]" as const,
    params: {
      seasonId,
      sourceId,
      ...(packId ? { packId } : {}),
      ...(poolId ? { poolId } : {}),
      ...(phaseReference ? { phaseReference } : {}),
    },
  };
}
