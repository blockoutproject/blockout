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
        return [...new Set(allMatches.flatMap(m => [m.teamIdA, m.teamIdB]))];
    }, [allMatches]);

    const poolIds = useMemo(() => {
        return [...new Set(dayMatches.flatMap(day =>
            day.pools.map(pool => pool.poolId)
        ))];
    }, [dayMatches]);

    const { entitiesMap: teamsMap, isLoading: isLoadingTeams } = useTeamsByIds(teamIds);
    const { entitiesMap: poolsMap, isLoading: isLoadingPools } = usePoolsByIds(poolIds);

    const enrichedDayMatches: EnrichedDayMatchesDTO[] = useMemo(() => {
        return dayMatches.map(day => ({
            ...day,
            pools: day.pools.map(pool => ({
                ...pool,
                poolData: poolsMap[pool.poolId],
                matches: pool.matches.map(match => ({
                    ...match,
                    teamA: teamsMap[match.teamIdA],
                    teamB: teamsMap[match.teamIdB],
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