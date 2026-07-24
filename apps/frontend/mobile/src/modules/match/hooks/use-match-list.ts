import { useMemo } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import {
  DayMatchesResponse,
  MatchStatusEnum,
} from "@/src/shared/generated/models";
import { useApis } from "@/src/shared/providers/api-provider";

export const useMatchList = (
  status: MatchStatusEnum,
  poolIds?: number[],
  teamIds?: number[],
  pageSize?: number,
) => {
  const { mobile } = useApis();

  const poolsKey = useMemo(
    () =>
      poolIds?.length ? [...poolIds].sort((a, b) => a - b).join(",") : "none",
    [poolIds],
  );
  const teamsKey = useMemo(
    () =>
      teamIds?.length ? [...teamIds].sort((a, b) => a - b).join(",") : "none",
    [teamIds],
  );

  const queryKey = useMemo(
    () => [
      "match-list",
      status,
      `p:${poolsKey}`,
      `t:${teamsKey}`,
      `size:${pageSize}`,
    ],
    [status, poolsKey, teamsKey, pageSize],
  );

  const query = useInfiniteQuery({
    queryKey,
    queryFn: ({ pageParam = 0 }) =>
      mobile.matches.getMatches({
        page: pageParam,
        size: pageSize,
        poolIds,
        teamIds,
        status,
      }),
    initialPageParam: 0,
    getNextPageParam: (lastPage) => lastPage?.nextPage ?? undefined,
    staleTime: 5 * 60 * 1000,
    retry: false,
  });

  const pages = query.data?.pages ?? [];
  const dayMatches: DayMatchesResponse[] =
    pages.map((p) => p.dayMatches).flat() ?? [];

  const hasLoadedOnce = pages.length > 0;
  const isBackgroundRefetching =
    query.isFetching && !query.isLoading && !query.isFetchingNextPage;

  return {
    ...query,
    dayMatches,
    hasLoadedOnce,
    isBackgroundRefetching,
  };
};
