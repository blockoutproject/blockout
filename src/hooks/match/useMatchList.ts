import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import MobileGatewayApi from "@/src/api/MobileGatewayApi";
import { EnrichedDayMatchesDTO, MatchStatus } from "@/src/types/Match";
import { useMemo } from "react";

export const useMatchList = (
    status: MatchStatus,
    poolIds?: number[],
    teamIds?: number[],
    pageSize = 10
) => {
    const queryKey = useMemo(
        () => ['match-list', { poolIds, teamIds, status }],
        [poolIds, teamIds, status]
    );

    const queryResult = useInfiniteQuery({
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
        getNextPageParam: (_last, _pages, current) => current + 1,
        staleTime: 1000 * 60 * 5,
    });

    const dayMatches: EnrichedDayMatchesDTO[] = queryResult.data?.pages.flat() ?? [];
    return {
        ...queryResult,
        dayMatches,
    };
};