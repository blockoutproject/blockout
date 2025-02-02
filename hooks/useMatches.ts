import MatchesApi from '@/api/MatchesApi';
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { DayPageDTO, DayMatchesDTO, Match } from '@/types/Match';

export function useMatches(pageSize = 1) {
    const queryClient = useQueryClient();

    const queryResult = useInfiniteQuery({
        queryKey: ['matches'],
        queryFn: async ({ pageParam = 0 }) => {
            return MatchesApi.getInstance().getMatches({ page: pageParam, size: pageSize });
        },
        initialPageParam: 0,
        getNextPageParam: (lastPage: DayPageDTO) => lastPage.next_page ?? undefined,
        select: (data) => {
            // Extraire les matchs sous leur structure originale
            const dayMatches: DayMatchesDTO[] = data.pages.flatMap(page => page.day_matches);
            const allMatches: Match[] = dayMatches.flatMap(day =>
                day.pools.flatMap(pool => pool.matches)
            );

            // Enregistrer chaque match individuellement dans le cache
            allMatches.forEach(match => {
                queryClient.setQueryData(['match', match.id], match);
            });

            // Retourner les données groupées mais sans aplatir complètement
            return { ...data, dayMatches };
        },
    });

    return {
        ...queryResult,
        dayMatches: queryResult.data?.dayMatches || [],
    };
}