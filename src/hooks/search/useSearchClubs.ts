import { useQuery } from '@tanstack/react-query';
import SearchApi from '@/src/api/SearchApi';
import { ClubSearchDoc } from '@/src/types/docs/ClubSearchDoc';

export const useSearchClubs = (query: string, triggerOnEmpty = false) => {
    return useQuery<ClubSearchDoc[]>({
        queryKey: ['clubs', 'search', query],
        queryFn: async () => SearchApi.getInstance().searchClubs(query),
        enabled: triggerOnEmpty || query.length > 0,
        staleTime: 1000 * 60 * 5,
        retry: false,
    });
};