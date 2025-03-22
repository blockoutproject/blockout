import { useQuery } from '@tanstack/react-query';
import CompetitionApi from '@/src/api/CompetitionsApi';
import { CompetitionAssociation } from '@/src/types/Competition';

export function usePoolsAssocByTeam(teamId: number) {
    return useQuery<CompetitionAssociation[], Error>({
        queryKey: ['teamPools', teamId],
        queryFn: async () => {
            if (!teamId) {
                throw new Error("Aucun identifiant d'équipe fourni");
            }
            return CompetitionApi.getInstance().getPoolsAssocByTeam(teamId);
        },
        staleTime: 1000 * 60 * 5,
        enabled: !!teamId,
    });
}