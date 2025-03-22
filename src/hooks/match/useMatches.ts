// useMatches.ts
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import MatchesApi from '@/src/api/MatchesApi';
import { DayPageDTO, DayMatchesDTO, Match, MatchStatus } from '@/src/types/Match';
import { useMemo } from 'react';

export function useMatches(status: MatchStatus, poolIds?: number[], teamIds?: number[], pageSize = 3) {
    const queryClient = useQueryClient();

    const queryResult = useInfiniteQuery({
        queryKey: useMemo(() => [
            'matches',
            {
                poolIds: poolIds ?? [],
                teamIds: teamIds ?? [],
                status
            }
        ], [poolIds, teamIds, status]),
        queryFn: async ({ pageParam = 0 }) => {
            return MatchesApi
                .getInstance()
                .getMatches({ page: pageParam, size: pageSize, poolIds, teamIds, status });
        },
        getNextPageParam: (lastPage: DayPageDTO) => lastPage.next_page ?? undefined,
        select: (data) => {
            const dayMatches: DayMatchesDTO[] = data.pages.flatMap(page => page.day_matches);
            const allMatches: Match[] = dayMatches.flatMap(day => day.pools.flatMap(pool => pool.matches));

            allMatches.forEach(match => {
                queryClient.setQueryData(['match', match.id], match);
            });

            return { ...data, dayMatches };
        },
        initialPageParam: 0,
    });

    return {
        ...queryResult,
        refetch: queryResult.refetch,
        dayMatches: queryResult.data?.dayMatches || [],
    };
}