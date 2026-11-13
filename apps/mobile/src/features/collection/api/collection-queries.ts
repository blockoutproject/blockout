import { isAccessDenied } from "@/shared/api/access-denied";
import {
  infiniteQueryOptions,
  queryOptions,
  type QueryFunctionContext,
} from "@tanstack/react-query";
import {
  getCollectionControl,
  getCollectionSeason,
  getCollectionSource,
  getGetCollectionControlQueryKey,
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
import { ApiError, type ApiFetchOptions } from "@/shared/api/api-fetch";

/** A refused permission or missing exact collection resource cannot authorize another command. */
export function isCollectionReadRefused(error: unknown): boolean {
  return (
    isAccessDenied(error) ||
    (error instanceof ApiError && error.kind === "http" && error.status === 404)
  );
}

/** Collection query availability and native authenticated request preparation. */
export interface CollectionQueryAuthority {
  enabled: boolean;
  request(): Promise<ApiFetchOptions>;
}

/** Defines every collection read once; native Query owns data, cancellation, pagination and status. */
export function createCollectionQueries(authority: CollectionQueryAuthority) {
  /** Withdraws refused preparation data without masking a later read error; mounted forms own their drafts. */
  async function readPreparation<T>(
    context: QueryFunctionContext,
    execute: (options: ApiFetchOptions) => Promise<T>,
  ): Promise<T | null> {
    try {
      return await execute({
        ...(await authority.request()),
        signal: context.signal,
      });
    } catch (error) {
      if (!context.signal.aborted && isCollectionReadRefused(error)) {
        context.client.setQueryData<T | null>(context.queryKey, null, {
          updatedAt:
            context.client.getQueryState(context.queryKey)?.dataUpdatedAt ?? 0,
        });
      }
      throw error;
    }
  }

  /** Removes a refused or missing list/control snapshot so a technical failure cannot restore it. */
  function rejectDenied(error: unknown, context: QueryFunctionContext): never {
    if (!context.signal.aborted && isCollectionReadRefused(error)) {
      context.client
        .getQueryCache()
        .find({ queryKey: context.queryKey, exact: true })
        ?.setState({ data: undefined, dataUpdatedAt: 0 });
    }
    throw error;
  }

  return {
    /** Canonical seasons, without provider calls or implicit season creation. */
    seasons: () =>
      queryOptions({
        queryKey: getListCollectionSeasonsQueryKey(),
        enabled: authority.enabled,
        gcTime: 0,
        queryFn: async (context) => {
          try {
            return await listCollectionSeasons({
              ...(await authority.request()),
              signal: context.signal,
            });
          } catch (error) {
            return rejectDenied(error, context);
          }
        },
      }),
    /** One season shared by navigation, preparation and terminal closure. */
    season: (seasonId: string) =>
      queryOptions({
        queryKey: getGetCollectionSeasonQueryKey(seasonId),
        enabled: authority.enabled,
        gcTime: 0,
        queryFn: (context) =>
          readPreparation(context, (options) =>
            getCollectionSeason(seasonId, options),
          ),
      }),
    /** Complete source configuration for the selected season. */
    sources: (seasonId: string) =>
      queryOptions({
        queryKey: getListCollectionSourcesQueryKey(seasonId),
        enabled: authority.enabled,
        gcTime: 0,
        queryFn: (context) =>
          readPreparation(context, (options) =>
            listCollectionSources(seasonId, options),
          ),
      }),
    /** Exact source binding supplies the retained candidate editor and its ordinary commands. */
    source: (sourceId: string) =>
      queryOptions({
        queryKey: getGetCollectionSourceQueryKey(sourceId),
        enabled: authority.enabled,
        gcTime: 0,
        queryFn: (context) =>
          readPreparation(context, (options) =>
            getCollectionSource(sourceId, options),
          ),
      }),
    /** Direct children use one infinite entry per parent and page size; page numbers stay in pageParam. */
    children: (sourceId: string, parentId?: string) => {
      const params = { parentId, size: 50 };
      return infiniteQueryOptions({
        queryKey: getListCollectionSourceChildrenQueryKey(sourceId, params),
        enabled: authority.enabled,
        gcTime: 0,
        initialPageParam: 0,
        queryFn: async (context) => {
          try {
            return await listCollectionSourceChildren(
              sourceId,
              { ...params, page: context.pageParam },
              { ...(await authority.request()), signal: context.signal },
            );
          } catch (error) {
            return rejectDenied(error, context);
          }
        },
        getNextPageParam: (last) => (last.hasNext ? last.page + 1 : undefined),
      });
    },
    /** Season-specific controls and seasonless families have distinct generated selections. */
    controls: (seasonId?: string) => {
      const params = seasonId ? { seasonId } : undefined;
      return queryOptions({
        queryKey: getListCollectionControlsQueryKey(params),
        enabled: authority.enabled,
        gcTime: 0,
        queryFn: async (context) => {
          try {
            return await listCollectionControls(params, {
              ...(await authority.request()),
              signal: context.signal,
            });
          } catch (error) {
            return rejectDenied(error, context);
          }
        },
      });
    },
    /** Current control configuration shared by observation and explicit commands. */
    control: (controlId: string) =>
      queryOptions({
        queryKey: getGetCollectionControlQueryKey(controlId),
        enabled: authority.enabled,
        gcTime: 0,
        queryFn: async (context) => {
          try {
            return await getCollectionControl(controlId, {
              ...(await authority.request()),
              signal: context.signal,
            });
          } catch (error) {
            return rejectDenied(error, context);
          }
        },
      }),
    /** Paged evidence includes response-shaping size in the key without creating one cache per page. */
    results: (controlId: string) => {
      const params = { size: 50 };
      return infiniteQueryOptions({
        queryKey: getListCollectionResultsQueryKey(controlId, params),
        enabled: authority.enabled,
        gcTime: 0,
        initialPageParam: 0,
        queryFn: async (context) => {
          try {
            return await listCollectionResults(
              controlId,
              { ...params, page: context.pageParam },
              { ...(await authority.request()), signal: context.signal },
            );
          } catch (error) {
            return rejectDenied(error, context);
          }
        },
        getNextPageParam: (last) => (last.hasNext ? last.page + 1 : undefined),
      });
    },
  };
}
