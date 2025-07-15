import { useQuery } from '@tanstack/react-query';
import SearchApi from '@/src/api/SearchApi';
import { ClubSearchDoc } from '@/src/types/docs/ClubSearchDoc';

export const useSearchClubs = (query: string) => {
    return useQuery<ClubSearchDoc[]>({
        queryKey: ['clubs', 'search', query],
        queryFn: async () => {
            return SearchApi.getInstance().searchClubs(query);
        },
        enabled: query.length > 0,
        staleTime: 1000 * 60,
    });
};