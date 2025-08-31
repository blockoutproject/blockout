import { useMemo } from "react";
import { useInfiniteQuery, keepPreviousData } from "@tanstack/react-query";
import MobileGatewayApi from "@/src/api/MobileGatewayApi";
import { EnrichedDayMatchesDTO, MatchStatus } from "@/src/types/Match";

export const useMatchList = (
    status: MatchStatus,
    poolIds?: number[],
    teamIds?: number[],
    pageSize = 10
) => {
    const poolsKey = useMemo(
        () => (poolIds?.length ? [...poolIds].sort((a, b) => a - b).join(",") : "none"),
        [poolIds]
    );
    const teamsKey = useMemo(
        () => (teamIds?.length ? [...teamIds].sort((a, b) => a - b).join(",") : "none"),
        [teamIds]
    );

    const queryKey = useMemo(
        () => ["match-list", status, `p:${poolsKey}`, `t:${teamsKey}`, `size:${pageSize}`],
        [status, poolsKey, teamsKey, pageSize]
    );

    const query = useInfiniteQuery({
        queryKey,
        queryFn: ({ pageParam = 0 }) =>
            MobileGatewayApi.getInstance().getEnrichedMatches({
                page: pageParam,
                size: pageSize,
                poolIds,
                teamIds,
                status,
            }),
        initialPageParam: 0,
        getNextPageParam: (lastPage) => lastPage?.nextPage ?? undefined,
        staleTime: 5 * 60 * 1000,
        retry: false
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