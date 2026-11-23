import {
  CollectionProviderEnum,
  CollectionResultSourceResponse,
  CollectionSourceScopeEnum,
  ListCollectionResultsParams,
  SourceCatalogStatusEnum,
} from "../../../../.generated/schemas/index.zod";
import type { CollectionResultCriteria } from "../api/collection-queries";
import { supportsSourceScopeFilter } from "./collection-operator-source";
import type { SourceFilters } from "./source-catalogue";

export function collectionProviderFromRoute(value: unknown) {
  return CollectionProviderEnum.safeParse(value).data;
}

type RouteParams = Record<string, string | string[] | undefined>;

export type BilanSearchCriteria = Pick<
  CollectionResultCriteria,
  "query" | "status"
>;

/** Text and status are available in both Bilan scopes. */
export function collectionBilanSearchCriteria(
  params: RouteParams,
): BilanSearchCriteria {
  const { query, status } = ListCollectionResultsParams.shape;
  return {
    query: query.safeParse(params.query).data || undefined,
    status: status.safeParse(params.status).data,
  };
}

/** Admits only the generated list criteria from a committed Bilan navigation entry. */
export function collectionBilanRouteCriteria(
  params: RouteParams,
): CollectionResultCriteria {
  const { sourceId, stage } = ListCollectionResultsParams.shape;
  return {
    ...collectionBilanSearchCriteria(params),
    sourceId: sourceId.safeParse(params.sourceId).data,
    stage: stage.safeParse(params.stage).data,
  };
}

export type SourceCatalogueFocus = Pick<
  CollectionResultSourceResponse,
  "packId" | "poolId" | "phaseReference"
>;

/** Optional focus can identify only an actual row in the destination binding. */
export function collectionSourceRouteFocus(
  params: Record<string, string | string[] | undefined>,
): SourceCatalogueFocus {
  const fields = CollectionResultSourceResponse.shape;
  return {
    packId: fields.packId.safeParse(params.packId).data,
    poolId: fields.poolId.safeParse(params.poolId).data,
    phaseReference:
      fields.phaseReference.safeParse(params.phaseReference).data || undefined,
  };
}

export function sourceFiltersFromRoute(
  params: Record<string, string | string[] | undefined>,
  provider: CollectionProviderEnum,
): SourceFilters {
  return {
    status: SourceCatalogStatusEnum.safeParse(params.status).data,
    scope: supportsSourceScopeFilter(provider)
      ? CollectionSourceScopeEnum.safeParse(params.scope).data
      : undefined,
  };
}
