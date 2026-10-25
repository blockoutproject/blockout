import { infiniteQueryOptions, queryOptions } from "@tanstack/react-query";
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
import type { ApiFetchOptions } from "../../../shared/api/api-fetch";
import { getSessionQueryKey } from "../../../shared/query/query-client";

/** Captured collection authority rechecks the current grant after obtaining native credentials. */
export interface CollectionQueryAuthority {
  session: { generation: string };
  enabled: boolean;
  request(): Promise<ApiFetchOptions>;
}

/** Defines every collection read once; native Query owns data, cancellation, pagination and status. */
export function createCollectionQueries(authority: CollectionQueryAuthority) {
  return {
    /** Canonical seasons, without provider calls or implicit season creation. */
    seasons: () =>
      queryOptions({
        queryKey: getSessionQueryKey(
          authority.session.generation,
          getListCollectionSeasonsQueryKey(),
        ),
        enabled: authority.enabled,
        gcTime: 0,
        queryFn: async ({ signal }) =>
          listCollectionSeasons({ ...(await authority.request()), signal }),
      }),
    /** One season shared by navigation, preparation and terminal closure. */
    season: (seasonId: string) =>
      queryOptions({
        queryKey: getSessionQueryKey(
          authority.session.generation,
          getGetCollectionSeasonQueryKey(seasonId),
        ),
        enabled: authority.enabled,
        gcTime: 0,
        queryFn: async ({ signal }) =>
          getCollectionSeason(seasonId, {
            ...(await authority.request()),
            signal,
          }),
      }),
    /** Complete source configuration for the selected season. */
    sources: (seasonId: string) =>
      queryOptions({
        queryKey: getSessionQueryKey(
          authority.session.generation,
          getListCollectionSourcesQueryKey(seasonId),
        ),
        enabled: authority.enabled,
        gcTime: 0,
        queryFn: async ({ signal }) =>
          listCollectionSources(seasonId, {
            ...(await authority.request()),
            signal,
          }),
      }),
    /** Exact source binding whose accepted response also reconciles candidate commands. */
    source: (sourceId: string) =>
      queryOptions({
        queryKey: getSessionQueryKey(
          authority.session.generation,
          getGetCollectionSourceQueryKey(sourceId),
        ),
        enabled: authority.enabled,
        gcTime: 0,
        queryFn: async ({ signal }) =>
          getCollectionSource(sourceId, {
            ...(await authority.request()),
            signal,
          }),
      }),
    /** Direct children use one infinite entry per parent and page size; page numbers stay in pageParam. */
    children: (sourceId: string, parentId?: string) => {
      const params = { parentId, size: 50 };
      return infiniteQueryOptions({
        queryKey: getSessionQueryKey(
          authority.session.generation,
          getListCollectionSourceChildrenQueryKey(sourceId, params),
        ),
        enabled: authority.enabled,
        gcTime: 0,
        initialPageParam: 0,
        queryFn: async ({ pageParam, signal }) =>
          listCollectionSourceChildren(
            sourceId,
            { ...params, page: pageParam },
            { ...(await authority.request()), signal },
          ),
        getNextPageParam: (last) => (last.hasNext ? last.page + 1 : undefined),
      });
    },
    /** Season-specific controls and seasonless families have distinct generated selections. */
    controls: (seasonId?: string) => {
      const params = seasonId ? { seasonId } : undefined;
      return queryOptions({
        queryKey: getSessionQueryKey(
          authority.session.generation,
          getListCollectionControlsQueryKey(params),
        ),
        enabled: authority.enabled,
        gcTime: 0,
        queryFn: async ({ signal }) =>
          listCollectionControls(params, {
            ...(await authority.request()),
            signal,
          }),
      });
    },
    /** Current control configuration shared by observation and explicit command reconciliation. */
    control: (controlId: string) =>
      queryOptions({
        queryKey: getSessionQueryKey(
          authority.session.generation,
          getGetCollectionControlQueryKey(controlId),
        ),
        enabled: authority.enabled,
        gcTime: 0,
        queryFn: async ({ signal }) =>
          getCollectionControl(controlId, {
            ...(await authority.request()),
            signal,
          }),
      }),
    /** Paged evidence includes response-shaping size in the key without creating one cache per page. */
    results: (controlId: string) => {
      const params = { size: 50 };
      return infiniteQueryOptions({
        queryKey: getSessionQueryKey(
          authority.session.generation,
          getListCollectionResultsQueryKey(controlId, params),
        ),
        enabled: authority.enabled,
        gcTime: 0,
        initialPageParam: 0,
        queryFn: async ({ pageParam, signal }) =>
          listCollectionResults(
            controlId,
            { ...params, page: pageParam },
            { ...(await authority.request()), signal },
          ),
        getNextPageParam: (last) => (last.hasNext ? last.page + 1 : undefined),
      });
    },
  };
}
