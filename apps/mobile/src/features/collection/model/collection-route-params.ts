import {
  CollectionProviderEnum,
  CollectionResultSourceResponse,
  CollectionSourceScopeEnum,
  ListCollectionResultsParams,
  SourceCatalogStatusEnum,
} from "../../../../.generated/schemas/index.zod";
import type { CollectionResultCriteria } from "../api/collection-queries";
import type { SourceFilters } from "./source-catalogue";

export function collectionProviderFromRoute(value: unknown) {
  return CollectionProviderEnum.safeParse(value).data;
}

/** Admits only the generated list criteria from a committed Bilan navigation entry. */
export function collectionBilanRouteCriteria(
  params: Record<string, string | string[] | undefined>,
): CollectionResultCriteria {
  const fields = ListCollectionResultsParams.shape;
  const query = fields.query.safeParse(params.query);
  const sourceId = fields.sourceId.safeParse(params.sourceId);
  const status = fields.status.safeParse(params.status);
  const stage = fields.stage.safeParse(params.stage);
  return {
    query: query.data || undefined,
    sourceId: sourceId.data,
    status: status.data,
    stage: stage.data,
  };
}

/** A seasonless control offers outcome and text search without a competition catalogue. */
export function collectionClubBilanRouteCriteria(
  params: Record<string, string | string[] | undefined>,
): Pick<CollectionResultCriteria, "query" | "status"> {
  const { query, status } = collectionBilanRouteCriteria(params);
  return { query, status };
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
    scope:
      provider === "ffvb"
        ? CollectionSourceScopeEnum.safeParse(params.scope).data
        : undefined,
  };
}
