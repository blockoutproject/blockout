import { isResourceReadRefused } from "@/shared/api/access-denied";
import { discardCachedRead } from "@/shared/api/discard-cached-read";
import {
  infiniteQueryOptions,
  queryOptions,
  type QueryFunctionContext,
} from "@tanstack/react-query";
import {
  getCollectionSeason,
  getCollectionSource,
  getGetCollectionSeasonQueryKey,
  getGetCollectionSourceQueryKey,
  getListCollectionControlsQueryKey,
  getListCollectionResultsQueryKey,
  getListCollectionSeasonsQueryKey,
  getListCollectionSourceChildrenQueryKey,
  getListCollectionSourcesQueryKey,
  listCollectionControls,
  listCollectionResults,
  listCollectionSeasons,
  listCollectionSourceChildren,
  listCollectionSources,
} from "../../../../.generated/mobile";
import type { ListCollectionResultsParams } from "../../../../.generated/schemas/index.zod";
import { ApiError, type ApiFetchOptions } from "@/shared/api/api-fetch";

import { nextOffsetPage } from "@/shared/query/infinite-pages";

/** Collection query availability and native authenticated request preparation. */
export interface CollectionQueryAuthority {
  enabled: boolean;
  request(): Promise<ApiFetchOptions>;
}

/** Route-owned result criteria. Page and page size belong to the read consuming them. */
export type CollectionResultCriteria = Pick<
  ListCollectionResultsParams,
  "query" | "status" | "sourceId" | "stage"
>;

const collectionPageSize = 50;

/** Defines every collection read once; native Query owns data, cancellation, pagination and status. */
export function createCollectionQueries(authority: CollectionQueryAuthority) {
  /** A refused collection read must leave Query before any later technical failure. */
  async function readCollection<T>(
    context: QueryFunctionContext,
    execute: (options: ApiFetchOptions) => Promise<T>,
  ) {
    try {
      return await execute({
        ...(await authority.request()),
        signal: context.signal,
      });
    } catch (error) {
      if (!context.signal.aborted && isResourceReadRefused(error)) {
        discardCachedRead(context);
      }
      throw error;
    }
  }

  return {
    /** Canonical seasons, without provider calls or implicit season creation. */
    seasons: () =>
      queryOptions({
        queryKey: getListCollectionSeasonsQueryKey(),
        enabled: authority.enabled,
        gcTime: 0,
        queryFn: (context) => readCollection(context, listCollectionSeasons),
      }),
    /** One season shared by navigation, activation and terminal closure. */
    season: (seasonId: string) =>
      queryOptions({
        queryKey: getGetCollectionSeasonQueryKey(seasonId),
        enabled: authority.enabled,
        gcTime: 0,
        queryFn: (context) =>
          readCollection(context, (options) =>
            getCollectionSeason(seasonId, options),
          ),
      }),
    /** Official source catalogue bindings for the selected season. */
    sources: (seasonId: string) =>
      queryOptions({
        queryKey: getListCollectionSourcesQueryKey(seasonId),
        enabled: authority.enabled,
        gcTime: 0,
        queryFn: (context) =>
          readCollection(context, (options) =>
            listCollectionSources(seasonId, options),
          ),
      }),
    /** Exact source binding supplies the independently observed catalogue facts. */
    source: (sourceId: string) =>
      queryOptions({
        queryKey: getGetCollectionSourceQueryKey(sourceId),
        enabled: authority.enabled,
        gcTime: 0,
        queryFn: (context) =>
          readCollection(context, (options) =>
            getCollectionSource(sourceId, options),
          ),
      }),
    /** Direct children use one infinite entry per parent and page size; page numbers stay in pageParam. */
    children: (sourceId: string, parentId?: string) => {
      const params = { parentId, size: collectionPageSize };
      return infiniteQueryOptions({
        queryKey: getListCollectionSourceChildrenQueryKey(sourceId, params),
        enabled: authority.enabled,
        // An expanded pack can leave the native list's render window while browsing the same visit.
        initialPageParam: 0,
        queryFn: (context) =>
          readCollection(context, (options) =>
            listCollectionSourceChildren(
              sourceId,
              { ...params, page: context.pageParam },
              options,
            ),
          ),
        getNextPageParam: nextOffsetPage,
      });
    },
    /** Season-specific controls and seasonless families have distinct generated selections. */
    controls: (seasonId?: string) => {
      const params = seasonId ? { seasonId } : undefined;
      return queryOptions({
        queryKey: getListCollectionControlsQueryKey(params),
        enabled: authority.enabled,
        gcTime: 0,
        queryFn: (context) =>
          readCollection(context, (options) =>
            listCollectionControls(params, options),
          ),
      });
    },
    /** Suivi reads one page of evidence for its whole-control totals, independently of the Bilan traversal. */
    resultSummary: (controlId: string) => {
      const params = { size: 1 };
      return queryOptions({
        queryKey: getListCollectionResultsQueryKey(controlId, params),
        enabled: authority.enabled,
        gcTime: 0,
        queryFn: async (context) => {
          const page = await readCollection(context, (options) =>
            listCollectionResults(controlId, { ...params, page: 0 }, options),
          );
          if (!page.summary) {
            throw new ApiError("schema");
          }
          return page.summary;
        },
      });
    },
    /** Page identity stays in pageParam. Every response-shaping criterion belongs in the generated key. */
    results: (controlId: string, criteria: CollectionResultCriteria = {}) => {
      const params = { ...criteria, size: collectionPageSize };
      return infiniteQueryOptions({
        queryKey: getListCollectionResultsQueryKey(controlId, params),
        enabled: authority.enabled,
        gcTime: 0,
        initialPageParam: 0,
        queryFn: (context) =>
          readCollection(context, (options) =>
            listCollectionResults(
              controlId,
              { ...params, page: context.pageParam },
              options,
            ),
          ),
        getNextPageParam: nextOffsetPage,
      });
    },
  };
}
