import { useQuery } from '@tanstack/react-query';
import CompetitionApi from '@/api/CompetitionsApi';
import { CompetitionAssociation } from '@/types/Competition';
import PoolsApi from '@/api/PoolsApi';
import { Pool } from '@/types/Pool';

export function usePoolsByTeam(teamId: number) {
    return useQuery<CompetitionAssociation[], Error>({
        queryKey: ['teamPools', teamId],
        queryFn: async () => {
            if (!teamId) {
                throw new Error("Aucun identifiant d'équipe fourni");
            }
            return CompetitionApi.getInstance().getPoolsByTeam(teamId);
        },
        staleTime: 1000 * 60 * 5,
        enabled: !!teamId,
    });
}

export function useDetailedTeamPools(teamId: number) {
    const { data: teamPools, isLoading: isLoadingPools, isError } = usePoolsByTeam(teamId);

    const poolQueries = useQuery<Pool[], Error>({
        queryKey: ['teamPools', teamId],
        queryFn: async () => {
            if (!teamPools) return [];
            
            const poolDetails = await Promise.all(
                teamPools.map(async (entry) => {
                    const pool = await PoolsApi.getInstance().getPoolById(entry.pool_id);
                    return { 
                        ...pool,
                    };
                })
            );

            return poolDetails;
        },
        staleTime: 1000 * 60 * 5,
        enabled: !!teamPools && teamPools.length > 0,
    });

    return {
        pools: poolQueries.data,
        isLoading: isLoadingPools || poolQueries.isLoading,
        isError: isError || poolQueries.isError,
    };
}