// useMatchById.ts
import { useQuery } from '@tanstack/react-query';
import { useTeamById } from '../team/useTeamById';
import { Match } from '@/types/Match';
import MatchesApi from '@/api/MatchesApi';

export function useMatchById(matchId: number) {
    const matchQuery = useQuery<Match>({
        queryKey: ['match', matchId],
        queryFn: async () => {
            return MatchesApi.getInstance().getMatchById(matchId);
        },
        staleTime: 1000 * 60 * 5,
        enabled: true,
    });

    const match = matchQuery.data;

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