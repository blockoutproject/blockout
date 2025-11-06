import { useQuery } from '@tanstack/react-query';
import { useApis } from '@/src/context/ApiProvider';
import { TeamSearchDocDTO } from '@/src/types/Team';

export const useSearchTeams = (query: string) => {
    const { mobile } = useApis();

    return useQuery<TeamSearchDocDTO[]>({
        queryKey: ['teams', 'search', query],
        queryFn: async () => mobile.searchTeams(query),
        enabled: true,
        staleTime: 1000 * 60 * 5,
        retry: false,
    });
};