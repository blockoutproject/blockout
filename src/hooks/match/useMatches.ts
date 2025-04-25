import MatchesApi from "@/src/api/MatchesApi";
import { DayMatchesDTO, DayPageDTO, Match, MatchStatus } from "@/src/types/Match";
import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo } from "react";

export const useMatches = (
    status: MatchStatus,
    poolIds?: number[],
    teamIds?: number[],
    pageSize = 3
) => {
    const queryClient = useQueryClient();

    const queryKey = useMemo(
        () => ['matches', { poolIds, teamIds, status }],
        [poolIds, teamIds, status]
    );

    const queryResult = useInfiniteQuery({
        queryKey,
        queryFn: ({ pageParam = 0 }) =>
            MatchesApi.getInstance().getMatches({
                page: pageParam,
                size: pageSize,
                poolIds,
                teamIds,
                status,
            }),
        initialPageParam: 0,
        getNextPageParam: lastPage => lastPage.next_page,
        select: data => {
            const dayMatches: DayMatchesDTO[] = data.pages.flatMap(page => page.day_matches);
            const matches = dayMatches.flatMap(dm =>
                dm.pools.flatMap(p => p.matches)
            );

            matches.forEach(match =>
                queryClient.setQueryData<Match>(['match', match.id], match)
            );

            return { ...data, dayMatches, matches };
        },
        staleTime: 1000 * 60 * 5,
    });

    return {
        ...queryResult,
        dayMatches: queryResult.data?.dayMatches ?? [],
        matches: queryResult.data?.matches ?? [],
    };
};