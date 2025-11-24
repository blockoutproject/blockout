import { useQuery } from '@tanstack/react-query';
import { useApis } from '@/src/context/ApiProvider';
import { TeamSearchDocDTO } from '@/src/types/Team';

export const useSearchTeams = (query: string, season?: string) => {
    const { mobile } = useApis();

    return useQuery<TeamSearchDocDTO[]>({
        queryKey: ['teams', 'search', query, season],
        queryFn: async () => mobile.searchTeams(query, season),
        enabled: true,
        staleTime: 1000 * 60 * 5,
        retry: false,
    });
};