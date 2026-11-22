import {
  infiniteQueryOptions,
  type Query,
  type QueryFunctionContext,
} from "@tanstack/react-query";
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
import { isAccessDenied } from "@/shared/api/access-denied";
import { ApiError, type ApiFetchOptions } from "@/shared/api/api-fetch";
import { discardCachedRead } from "@/shared/api/discard-cached-read";
import type { SportingQueryAuthority } from "./sporting-administration-queries";

export type MappingCriteria = Omit<ListMappingPacksParams, "page" | "size">;

const size = 50;

function nextPage(last: { page: number; hasNext: boolean }) {
  return last.hasNext ? last.page + 1 : undefined;
}

/** A terminal read keeps its Retry surface until an explicit retry or write invalidation. */
function revalidateOnReturn(query: Pick<Query, "state">) {
  return query.state.status !== "error";
}

/** Mapping uses its own authorized projections, independent of Collection Sources. */
export function createMappingQueries(authority: SportingQueryAuthority) {
  async function read<T>(
    context: QueryFunctionContext,
    execute: (options: ApiFetchOptions) => Promise<T>,
  ) {
    try {
      return await execute(await authority.request(context.signal));
    } catch (error) {
      if (context.signal.aborted) {
        throw new ApiError("cancelled");
      }
      if (
        isAccessDenied(error) ||
        (error instanceof ApiError && error.status === 404)
      ) {
        discardCachedRead(context);
      }
      throw error;
    }
  }

  const paging = {
    initialPageParam: 0,
    getNextPageParam: nextPage,
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

/** Concurrent catalogue changes can repeat an identity across offset pages. */
export function uniqueMappingItems<Row extends { id: string }>(
  pages: readonly { items: Row[] }[],
) {
  return Array.from(
    new Map(
      pages.flatMap(({ items }) =>
        items.map((item) => [item.id, item] as const),
      ),
    ).values(),
  );
}
