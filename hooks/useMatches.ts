import MatchesApi from '@/api/MatchesApi';
import { useInfiniteQuery } from '@tanstack/react-query';
import { DayPageDTO, DayMatchesDTO } from '@/types/Match';

export function useMatches(pageSize: number = 1) {
    const { data, isLoading, isError, error, isFetching, fetchNextPage, hasNextPage } = useInfiniteQuery({
        queryKey: ['matches'],
        queryFn: ({ pageParam = 0 }) => MatchesApi.getInstance().getMatches({ page: pageParam, size: pageSize }),
        initialPageParam: 0,
        getNextPageParam: (lastPage: DayPageDTO) => lastPage.next_page ?? undefined,
    });

    const dayMatches: DayMatchesDTO[] = data?.pages.flatMap((page) => page.day_matches) || [];

    return { dayMatches, isLoading, isError, error, isFetching, fetchNextPage, hasNextPage };
}