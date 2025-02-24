import { useQuery } from '@tanstack/react-query';
import CompetitionApi from '@/api/CompetitionsApi';
import { CompetitionAssociation } from '@/types/Competition';

export function useTeamsAssocByPool(poolId: number) {
    return useQuery<CompetitionAssociation[], Error>({
        queryKey: ['poolTeams', poolId],
        queryFn: async () => {
            if (!poolId) {
                throw new Error("Aucun identifiant de pool fourni");
            }
            return CompetitionApi.getInstance().getTeamsAssocByPool(poolId);
        },
        staleTime: 1000 * 60 * 5,
        enabled: !!poolId,
    });
}