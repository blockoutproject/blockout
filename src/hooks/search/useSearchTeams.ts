import { useQuery } from '@tanstack/react-query';
import SearchApi from '@/src/api/SearchApi';
import { TeamSearchDoc } from '@/src/types/docs/TeamSearchDoc';

export const useSearchTeams = (query: string) => {
    return useQuery<TeamSearchDoc[]>({
        queryKey: ['teams', 'search', query],
        queryFn: async () => {
            return SearchApi.getInstance().searchTeams(query);
        },
        enabled: query.length > 0,
        staleTime: 1000 * 60,
        retry: false
    });
};