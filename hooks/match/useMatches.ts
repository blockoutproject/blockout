// useMatches.ts
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import MatchesApi from '@/api/MatchesApi';
import { DayPageDTO, DayMatchesDTO, Match, MatchStatus } from '@/types/Match';

export function useMatches(status: MatchStatus, poolId?: number, pageSize = 3) {
    const queryClient = useQueryClient();

    const queryResult = useInfiniteQuery({
        queryKey: poolId ? ['matches', poolId, status] : ['matches', status],
        queryFn: async ({ pageParam = 0 }) => {
            return MatchesApi
                .getInstance()
                .getMatches({ page: pageParam, size: pageSize, poolId, status });
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
        dayMatches: queryResult.data?.dayMatches || [],
    };
}