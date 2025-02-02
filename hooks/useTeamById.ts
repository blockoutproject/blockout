// useTeamById.ts
import TeamsApi from '@/api/TeamsApi';
import { useQuery } from '@tanstack/react-query';
import { Team } from '@/types/Team';

export function useTeamById(id: number | undefined) {
    return useQuery<Team, Error>({
        queryKey: ['team', id],
        queryFn: async () => {
            if (id === undefined) {
                throw new Error("Aucun identifiant d'équipe n'a été fourni");
            }
            return TeamsApi.getInstance().getTeamById(id);
        },
        staleTime: 1000 * 60 * 5,
        enabled: id !== undefined, // La query ne se lance que si id est défini
    });
}