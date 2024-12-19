import MatchesApi from '@/matches/v1Api';
import { useInfiniteQuery } from '@tanstack/react-query';

export function useMatches(pageSize: number = 10) {
    const { data, isLoading, isError, error, isFetching, fetchNextPage, hasNextPage } = useInfiniteQuery({
        queryKey: ['matches'],
        queryFn: ({ pageParam = 0 }) => MatchesApi.getInstance().getMatches({ page: pageParam, size: pageSize }),
        initialPageParam: 0,
        getNextPageParam: (lastPage) => {
            const nextPage = lastPage.number + 1;
            return nextPage < lastPage.totalPages ? nextPage : undefined;
        },
    });

    const matches = data?.pages.flatMap((page) => page.content) || [];

    return { matches, isLoading, isError, error, isFetching, fetchNextPage, hasNextPage };
}