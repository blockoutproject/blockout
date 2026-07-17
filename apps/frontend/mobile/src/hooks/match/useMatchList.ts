import { useMemo } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { EnrichedDayMatchesDTO, MatchStatus } from '@/src/types/Match';
import { listMobileMatchDays } from '@/src/api/generated/mobile-gateway/endpoints/mobile-matches/mobile-matches';
import {
  ListMobileMatchDaysQueryParams,
  ListMobileMatchDaysResponse,
} from '@/src/api/generated/mobile-gateway/schemas/mobile-matches/mobile-matches.zod';
import { toMatchDayPageView } from './matchView';

export const useMatchList = (
  status: MatchStatus,
  poolIds?: number[],
  teamIds?: number[],
  pageSize?: number,
) => {
  const poolsKey = useMemo(
    () =>
      poolIds?.length ? [...poolIds].sort((a, b) => a - b).join(',') : 'none',
    [poolIds],
  );
  const teamsKey = useMemo(
    () =>
      teamIds?.length ? [...teamIds].sort((a, b) => a - b).join(',') : 'none',
    [teamIds],
  );

  const queryKey = useMemo(
    () => [
      'match-list',
      status,
      `p:${poolsKey}`,
      `t:${teamsKey}`,
      `size:${pageSize}`,
    ],
    [status, poolsKey, teamsKey, pageSize],
  );

  const query = useInfiniteQuery({
    queryKey,
    queryFn: async ({ pageParam = 0, signal }) => {
      const params = ListMobileMatchDaysQueryParams.parse({
        page: pageParam,
        pageSize,
        poolIds,
        teamIds,
        status,
      });
      const response = await listMobileMatchDays(params, undefined, signal);
      return toMatchDayPageView(ListMobileMatchDaysResponse.parse(response));
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage) => lastPage?.nextPage ?? undefined,
    staleTime: 5 * 60 * 1000,
    retry: false,
  });

  const pages = query.data?.pages ?? [];
  const dayMatches: EnrichedDayMatchesDTO[] =
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
