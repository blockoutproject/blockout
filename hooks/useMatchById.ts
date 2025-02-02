// useMatchById.ts
import { useQuery } from '@tanstack/react-query';
import { useTeamById } from './useTeamById';
import { Match } from '@/types/Match';
import MatchesApi from '@/api/MatchesApi';

export function useMatchById(matchId: number) {
    // Récupérer le match depuis le cache de React Query
    const matchQuery = useQuery<Match>({
        queryKey: ['match', matchId], // Utilisation de la clé unique pour chaque match
        queryFn: async () => {
            return MatchesApi.getInstance().getMatchById(matchId);
        },
        staleTime: 1000 * 60 * 5,
        enabled: false, // Empêche React Query de refetch si le match n'est pas dans le cache
    });

    const match = matchQuery.data;

    // Récupérer les équipes associées si le match existe
    const teamAQuery = useTeamById(match?.team_id_a);
    const teamBQuery = useTeamById(match?.team_id_b);

    return {
        match,
        teamA: teamAQuery.data,
        teamB: teamBQuery.data,
        isLoading: matchQuery.isLoading || teamAQuery.isLoading || teamBQuery.isLoading,
        isError: matchQuery.isError || teamAQuery.isError || teamBQuery.isError,
        error: matchQuery.error || teamAQuery.error || teamBQuery.error,
    };
}