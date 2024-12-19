import TeamsApi from '@/api/TeamsApi';
import { useQuery } from '@tanstack/react-query';

export function useTeamsByIds(ids?: number[]) {
    const { data: teams, isLoading, isError, error, isFetching } = useQuery({
        queryKey: ['teams', ids?.sort() || 'all'],
        queryFn: () => TeamsApi.getInstance().getTeamsByIds(ids),
        enabled: !!ids && ids.length > 0,
        staleTime: 1000 * 60 * 5, 
    });

    return { teams, isLoading, isError, error, isFetching };
}