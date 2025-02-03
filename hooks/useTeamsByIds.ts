import { useQueries } from "@tanstack/react-query";
import TeamsApi from "@/api/TeamsApi";
import { Team } from "@/types/Team";

export function useTeamsByIds(ids: number[]) {
    // Pour chaque ID, on lance une requête individuelle
    const teamQueries = useQueries({
        queries: ids.map(id => ({
            queryKey: ["team", id],
            queryFn: async (): Promise<Team> => {
                return TeamsApi.getInstance().getTeamById(id);
            },
            staleTime: 1000 * 60 * 5,
        })),
    });

    // Transformer la liste des équipes en dictionnaire { teamId: Team }
    const teams: Record<number, Team> = teamQueries.reduce((acc, query) => {
        if (query.data) {
            acc[query.data.id] = query.data;
        }
        return acc;
    }, {} as Record<number, Team>);

    const isLoading = teamQueries.some(query => query.isLoading);
    const isError = teamQueries.some(query => query.isError);
    const error = teamQueries.find(query => query.error)?.error;

    return { teams, isLoading, isError, error };
}