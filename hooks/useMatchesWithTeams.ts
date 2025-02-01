import { useMemo } from "react";
import { useMatches } from "./useMatches";
import { useTeamsByIds } from "./useTeamsByIds";
import { Match } from "@/types/Match";
import { useQueryClient } from "@tanstack/react-query";

export function useMatchesWithTeams() {
    const {
        dayMatches,
        isLoading: isLoadingMatches,
        isError: isErrorMatches,
        error: errorMatches,
        fetchNextPage,
        isFetchingNextPage,
        hasNextPage
    } = useMatches();

    // Extraire les IDs uniques de toutes les équipes à partir des pools
    const teamIds = useMemo(() => {
        const set = new Set<number>();
        for (const day of dayMatches) {
            for (const pool of day.pools) {
                for (const match of pool.matches) {
                    if (match.team_id_a) set.add(match.team_id_a);
                    if (match.team_id_b) set.add(match.team_id_b);
                }
            }
        }
        return Array.from(set).sort((a, b) => a - b);
    }, [dayMatches]);

    // Fetch des équipes correspondantes aux IDs récupérés
    const {
        teams,
        isLoading: isLoadingTeams,
        isError: isErrorTeams,
        error: errorTeams
    } = useTeamsByIds(teamIds);

    // Chargement global (premier rendu)
    const isLoading = isLoadingMatches || (isLoadingTeams && dayMatches.length === 0);

    // Chargement incrémental (pagination ou nouveaux IDs d'équipes)
    const isFetching = isFetchingNextPage || (isLoadingTeams && dayMatches.length > 0);

    const isError = isErrorMatches || isErrorTeams;
    const error = errorMatches || errorTeams;

    return {
        dayMatches,
        teams,
        isLoading,
        isFetching,
        isError,
        error,
        fetchNextPage,
        isFetchingNextPage,
        hasNextPage
    };
}