import { useQuery } from '@tanstack/react-query';
import { useApis } from '@/src/context/ApiProvider';
import { PoolSearchDocDTO } from '@/src/types/Pool';

export const useSearchPools = (query: string, triggerOnEmpty = false) => {
    const { mobile } = useApis();
    
    return useQuery<PoolSearchDocDTO[]>({
        queryKey: ['pools', 'search', query],
        queryFn: async () => mobile.searchPools(query),
        enabled: triggerOnEmpty || query.length > 0,
        staleTime: 1000 * 60 * 5,
        retry: false,
    });
};