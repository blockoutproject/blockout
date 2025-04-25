import { useEntityById } from '../utils/useEntityById'
import { useTeamById } from '../team/useTeamById'
import { usePoolById } from '../pool/usePoolById'
import MatchesApi from '@/src/api/MatchesApi'
import type { Match } from '@/src/types/Match'

export function useMatchById(matchId: number) {
    const matchQuery = useEntityById<Match>('match', id => MatchesApi.getInstance().getMatchById(id), matchId)

    const teamAQuery = useTeamById(matchQuery.data?.team_id_a)
    const teamBQuery = useTeamById(matchQuery.data?.team_id_b)
    const poolQuery = usePoolById(matchQuery.data?.pool_id)

    return {
        match: matchQuery.data,
        teamA: teamAQuery.data,
        teamB: teamBQuery.data,
        pool: poolQuery.data,
        isLoading:
            matchQuery.isLoading ||
            teamAQuery.isLoading ||
            teamBQuery.isLoading ||
            poolQuery.isLoading,
        isError:
            matchQuery.isError ||
            teamAQuery.isError ||
            teamBQuery.isError ||
            poolQuery.isError,
        error:
            matchQuery.error ||
            teamAQuery.error ||
            teamBQuery.error ||
            poolQuery.error,
    }
}