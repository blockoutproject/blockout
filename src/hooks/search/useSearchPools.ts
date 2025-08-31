import { useQuery } from '@tanstack/react-query';
import SearchApi from '@/src/api/SearchApi';
import { PoolSearchDoc } from '@/src/types/docs/PoolSearchDoc';

export const useSearchPools = (query: string) => {
    return useQuery<PoolSearchDoc[]>({
        queryKey: ['pools', 'search', query],
        queryFn: async () => {
            return SearchApi.getInstance().searchPools(query);
        },
        enabled: query.length > 0,
        staleTime: 1000 * 60,
        retry: false
    });
};