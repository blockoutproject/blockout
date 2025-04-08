import { useQuery } from '@tanstack/react-query';
import TeamsApi from '@/src/api/TeamsApi';
import { Team } from '@/src/types/Team';

export const useSearchTeams = (query: string) => {
    return useQuery<Team[]>({
        queryKey: ['teams', 'search', query],
        queryFn: async () => {
            if (!query || query.length < 2) return []; // éviter spam
            const api = TeamsApi.getInstance();
            return api.searchTeamsByName(query);
        },
        enabled: query.length > 1, // déclencher que si query significative
        staleTime: 1000 * 60, // 1 minute
    });
};