import { teamsApi } from '@/api/teamsApi';
import { useQuery } from '@tanstack/react-query';

export function useTeamsByIds(ids?: number[]) {
    const { data: teams, isLoading, isError, error, isFetching } = useQuery({
        queryKey: ['teams', ids?.sort() || 'all'],
        queryFn: () => teamsApi.getTeamsByIds(ids),
        enabled: !!ids && ids.length > 0,
        staleTime: 1000 * 60 * 5, 
    });

    return { teams, isLoading, isError, error, isFetching };
}