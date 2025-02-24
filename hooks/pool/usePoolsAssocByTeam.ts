import { useQuery } from '@tanstack/react-query';
import CompetitionApi from '@/api/CompetitionsApi';
import { CompetitionAssociation } from '@/types/Competition';

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