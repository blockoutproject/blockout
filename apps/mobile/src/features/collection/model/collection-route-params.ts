import {
  CollectionProviderEnum,
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
