import type {
  CollectionProviderEnum,
  CollectionResultSourceResponse,
} from "../../../../.generated/schemas/index.zod";
import type { CollectionResultCriteria } from "../api/collection-queries";
import type { SourceFilters } from "./source-catalogue";

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
  // DismissTo updates the retained route. Empty values clear criteria from that visit.
  const criteriaParams = criteria && {
    query: criteria.query ?? "",
    status: criteria.status ?? "",
    sourceId: criteria.sourceId ?? "",
    stage: criteria.stage ?? "",
  };
  return {
    pathname: "/collection/[seasonId]/controls/[provider]/bilan" as const,
    params: { seasonId, provider, ...criteriaParams },
  };
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
