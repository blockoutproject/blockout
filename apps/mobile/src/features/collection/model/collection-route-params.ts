import {
  CollectionProviderEnum,
  CollectionResultSourceResponse,
  ListCollectionResultsParams,
} from "../../../../.generated/schemas/index.zod";
import type { CollectionResultCriteria } from "../api/collection-queries";

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
