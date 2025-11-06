import { useQuery } from '@tanstack/react-query';
import { useApis } from '@/src/context/ApiProvider';
import { ClubSearchDocDTO } from '@/src/types/Club';

export const useSearchClubs = (query: string, triggerOnEmpty = false) => {
    const { mobile } = useApis();

    return useQuery<ClubSearchDocDTO[]>({
        queryKey: ['clubs', 'search', query],
        queryFn: async () => mobile.searchClubs(query),
        enabled: triggerOnEmpty || query.length > 0,
        staleTime: 1000 * 60 * 5,
        retry: false,
    });
};