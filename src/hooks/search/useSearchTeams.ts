import { useQuery } from '@tanstack/react-query';
import SearchApi from '@/src/api/SearchApi';
import { TeamSearchDoc } from '@/src/types/docs/TeamSearchDoc';

export const useSearchTeams = (query: string, triggerOnEmpty = false) => {
    return useQuery<TeamSearchDoc[]>({
        queryKey: ['teams', 'search', query],
        queryFn: async () => SearchApi.getInstance().searchTeams(query),
        enabled: triggerOnEmpty || query.length > 0,
        staleTime: 1000 * 60 * 5,
        retry: false,
    });
};