// useMatchById.ts
import { useQuery } from '@tanstack/react-query';
import { useTeamById } from '../team/useTeamById';
import { Match } from '@/src/types/Match';
import MatchesApi from '@/src/api/MatchesApi';
import { usePoolById } from '../pool/usePoolById';

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
    const poolQuery = usePoolById(match?.pool_id);

    return {
        match,
        teamA: teamAQuery.data,
        teamB: teamBQuery.data,
        pool: poolQuery.data,
        isLoading: matchQuery.isLoading || teamAQuery.isLoading || teamBQuery.isLoading || poolQuery.isLoading,
        isError: matchQuery.isError || teamAQuery.isError || teamBQuery.isError || poolQuery.isError,
        error: matchQuery.error || teamAQuery.error || teamBQuery.error || poolQuery.error,
    };
}