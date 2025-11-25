import { useQuery } from '@tanstack/react-query';
import { useApis } from '@/src/context/ApiProvider';
import { PoolSearchDocDTO } from '@/src/types/Pool';

export const useSearchPools = (query: string, season?: string) => {
    const { mobile } = useApis();

    return useQuery<PoolSearchDocDTO[]>({
        queryKey: ['pools', 'search', query, season],
        queryFn: async () => mobile.searchPools(query, season),
        enabled: true,
        staleTime: 1000 * 60 * 5,
        retry: false,
    });
};