import MatchesApi from '@/api/MatchesApi';
import { useInfiniteQuery } from '@tanstack/react-query';
import { DayPageDTO, DayMatchesDTO, Match } from '@/types/Match';

export function useMatches(pageSize = 1) {
    const queryResult = useInfiniteQuery({
        queryKey: ['matches'],
        queryFn: ({ pageParam = 0 }) =>
            MatchesApi.getInstance().getMatches({ page: pageParam, size: pageSize }),
        initialPageParam: 0,
        getNextPageParam: (lastPage: DayPageDTO) => lastPage.next_page ?? undefined,
        select: (data) => {
            // Aplatir toutes les données groupées pour obtenir une liste plate de matchs
            const dayMatches: DayMatchesDTO[] = data.pages.flatMap(page => page.day_matches);
            const flattenedMatches: Match[] = dayMatches.flatMap(day =>
                day.pools.flatMap(pool => pool.matches)
            );
            // On renvoie les données originales agrémentées de nos transformations
            return { ...data, dayMatches, flattenedMatches };
        },
    });

    return {
        ...queryResult,
        dayMatches: queryResult.data?.dayMatches || [],
        flattenedMatches: queryResult.data?.flattenedMatches || [],
    };
}