import { useQuery } from '@tanstack/react-query';
import CompetitionApi from '@/api/CompetitionsApi';
import TeamsApi from '@/api/TeamsApi';
import { CompetitionAssociation } from '@/types/Competition';
import { Team } from '@/types/Team';

interface TeamWithPoints extends Team {
    points: number;
    wins: number;
    losses: number;
    played: number;
    points_penalty: number;
    coef_points: number;
    coef_sets: number;
}

export function usePoolWithTeams(poolId: number) {
    return useQuery<CompetitionAssociation[], Error>({
        queryKey: ['poolTeams', poolId],
        queryFn: async () => {
            if (!poolId) {
                throw new Error("Aucun identifiant de pool fourni");
            }
            return CompetitionApi.getInstance().getTeamsByPool(poolId);
        },
        staleTime: 1000 * 60 * 5,
        enabled: !!poolId,
    });
}

export function useDetailedPoolTeams(poolId: number) {
    const { data: poolTeams, isLoading: isLoadingPoolTeams, isError } = usePoolWithTeams(poolId);

    const teamQueries = useQuery<TeamWithPoints[], Error>({
        queryKey: ['teamsWithPoints', poolId],
        queryFn: async () => {
            if (!poolTeams) return [];
            
            const teamDetails = await Promise.all(
                poolTeams.map(async (entry) => {
                    const team = await TeamsApi.getInstance().getTeamById(entry.team_id);
                    return { 
                        ...team, 
                        points: entry.points,
                        wins: entry.wins,
                        losses: entry.losses,
                        played: entry.played,
                        points_penalty: entry.points_penalty,
                        coef_points: entry.coef_points,
                        coef_sets: entry.coef_sets
                    };
                })
            );

            return teamDetails;
        },
        staleTime: 1000 * 60 * 5,
        enabled: !!poolTeams && poolTeams.length > 0,
    });

    return {
        teams: teamQueries.data,
        isLoading: isLoadingPoolTeams || teamQueries.isLoading,
        isError: isError || teamQueries.isError,
    };
}