import { TeamWithPoints } from "@/types/Team";
import { useQuery } from "@tanstack/react-query";
import TeamsApi from "@/api/TeamsApi";
import { useTeamsAssocByPool } from "./useTeamsAssocByPool";

export function useDetailedTeamsByPool(poolId: number) {
    const {
        data: poolTeams,
        isLoading: isLoadingPoolTeams,
        isSuccess: isSuccessPoolTeams,
        isError: isErrorPoolTeams,
    } = useTeamsAssocByPool(poolId);

    const detailedTeamsQuery = useQuery<TeamWithPoints[], Error>({
        queryKey: ['teamsWithPoints', poolId],
        queryFn: async () => {
            if (!poolTeams) return [];

            return Promise.all(
                poolTeams.map(async ({ team_id, points, wins, losses, played, points_penalty, coef_points, coef_sets }) => {
                    const team = await TeamsApi.getInstance().getTeamById(team_id);
                    return {
                        ...team,
                        points,
                        wins,
                        losses,
                        played,
                        points_penalty,
                        coef_points,
                        coef_sets,
                    };
                })
            );
        },
        staleTime: 1000 * 60 * 5,
        enabled: !!poolTeams && poolTeams.length > 0,
    });

    return {
        teams: detailedTeamsQuery.data,
        isLoading: isLoadingPoolTeams || detailedTeamsQuery.isLoading,
        isSuccess: isSuccessPoolTeams && detailedTeamsQuery.isSuccess && detailedTeamsQuery.data !== undefined,
        isError: isErrorPoolTeams || detailedTeamsQuery.isError,
    };
}