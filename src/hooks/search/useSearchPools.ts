import { useQuery } from '@tanstack/react-query';
import SearchApi from '@/src/api/SearchApi';
import { PoolSearchDoc } from '@/src/types/docs/PoolSearchDoc';

export const useSearchPools = (query: string, triggerOnEmpty = false) => {
    return useQuery<PoolSearchDoc[]>({
        queryKey: ['pools', 'search', query],
        queryFn: async () => SearchApi.getInstance().searchPools(query),
        enabled: triggerOnEmpty || query.length > 0,
        staleTime: 1000 * 60 * 5,
        retry: false,
    });
};