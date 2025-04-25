import { EnrichedDayMatchesDTO, MatchStatus } from '@/src/types/Match';
import { useMemo } from 'react';
import { useMatches } from './useMatches';
import { useTeamsByIds } from '../team/useTeamsByIds';
import { usePoolsByIds } from '../pool/usePoolsByIds';

export const useMatchesWithEntities = (
    status: MatchStatus,
    poolFilterIds?: number[],
    teamFilterIds?: number[],
    pageSize = 3
) => {
    const {
        data,
        fetchNextPage,
        hasNextPage,
        isFetchingNextPage,
        matches,
        dayMatches,
        isLoading: isLoadingMatches,
        isError,
        error,
        refetch,
    } = useMatches(status, poolFilterIds, teamFilterIds, pageSize);

    const allMatches = matches;

    const teamIds = useMemo(() => {
        return [...new Set(allMatches.flatMap(m => [m.team_id_a, m.team_id_b]))];
    }, [allMatches]);

    const poolIds = useMemo(() => {
        return [...new Set(dayMatches.flatMap(day =>
            day.pools.map(pool => pool.pool_id)
        ))];
    }, [dayMatches]);

    const { entitiesMap: teamsMap, isLoading: isLoadingTeams } = useTeamsByIds(teamIds);
    const { entitiesMap: poolsMap, isLoading: isLoadingPools } = usePoolsByIds(poolIds);

    const enrichedDayMatches: EnrichedDayMatchesDTO[] = useMemo(() => {
        return dayMatches.map(day => ({
            ...day,
            pools: day.pools.map(pool => ({
                ...pool,
                poolData: poolsMap[pool.pool_id],
                matches: pool.matches.map(match => ({
                    ...match,
                    teamA: teamsMap[match.team_id_a],
                    teamB: teamsMap[match.team_id_b],
                })),
            })),
        }));
    }, [dayMatches, teamsMap, poolsMap]);

    return {
        dayMatches: enrichedDayMatches,
        fetchNextPage,
        hasNextPage,
        isFetchingNextPage,
        isLoading: isLoadingMatches,
        isEntitiesLoading: isLoadingTeams || isLoadingPools,
        isError,
        error,
        refetch,
    };
};