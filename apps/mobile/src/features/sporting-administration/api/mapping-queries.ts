import { infiniteQueryOptions, type Query } from "@tanstack/react-query";
import {
  getGetMappingPackQueryKey,
  getListMappingFilterOptionsQueryKey,
  getListMappingPacksQueryKey,
  getMappingPack,
  listMappingFilterOptions,
  listMappingPacks,
} from "../../../../.generated/mobile";
import type {
  ListMappingPacksParams,
  MappingFilterDimensionEnum,
} from "../../../../.generated/schemas/index.zod";
import { discardCachedRead } from "@/shared/api/discard-cached-read";
import { nextOffsetPage } from "@/shared/query/infinite-pages";
import {
  createSportingReader,
  type SportingQueryAuthority,
} from "./sporting-administration-queries";

export type MappingCriteria = Omit<ListMappingPacksParams, "page" | "size">;

const size = 50;

/** A terminal read keeps its Retry surface until an explicit retry or write invalidation. */
function revalidateOnReturn(query: Pick<Query, "state">) {
  return query.state.status !== "error";
}

/** Mapping uses its own authorized projections, independent of Collection Sources. */
export function createMappingQueries(authority: SportingQueryAuthority) {
  const read = createSportingReader(authority, discardCachedRead);
  const paging = {
    initialPageParam: 0,
    getNextPageParam: nextOffsetPage,
    gcTime: 0,
    retryOnMount: false,
    refetchOnWindowFocus: revalidateOnReturn,
    refetchOnReconnect: revalidateOnReturn,
  };

  return {
    packs: (criteria: MappingCriteria, ready: boolean) => {
      const params = { ...criteria, size };
      return infiniteQueryOptions({
        ...paging,
        queryKey: getListMappingPacksQueryKey(params),
        enabled: authority.enabled && ready,
        queryFn: (context) =>
          read(context, (options) =>
            listMappingPacks({ ...params, page: context.pageParam }, options),
          ),
      });
    },
    pack: (packId: string) =>
      infiniteQueryOptions({
        ...paging,
        queryKey: getGetMappingPackQueryKey(packId, { size }),
        enabled: authority.enabled,
        queryFn: (context) =>
          read(context, (options) =>
            getMappingPack(packId, { size, page: context.pageParam }, options),
          ),
      }),
    filters: (dimension: MappingFilterDimensionEnum, enabled = true) => {
      const params = { dimension, size };
      return infiniteQueryOptions({
        ...paging,
        queryKey: getListMappingFilterOptionsQueryKey(params),
        enabled: authority.enabled && enabled,
        queryFn: (context) =>
          read(context, (options) =>
            listMappingFilterOptions(
              { ...params, page: context.pageParam },
              options,
            ),
          ),
      });
    },
  };
}
