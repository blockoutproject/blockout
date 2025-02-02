// useMatchesWithTeams.ts
import { useMemo } from "react";
import { useMatches } from "./useMatches";
import { useTeamsByIds } from "./useTeamsByIds";

export function useMatchesWithTeams() {
    const {
        data,           // Données brutes de l'infinite query
        dayMatches,     // Liste groupée (ou aplatie) de matchs
        isLoading: isLoadingMatches,
        isError: isErrorMatches,
        error: errorMatches,
        fetchNextPage,
        isFetchingNextPage,
        hasNextPage
    } = useMatches();

    // Calculer l'union de tous les team IDs depuis toutes les pages fetchées
    const allTeamIds = useMemo(() => {
        if (!data || !data.pages) return [];
        const ids = new Set<number>();
        data.pages.forEach(page => {
            page.day_matches.forEach(day => {
                day.pools.forEach(pool => {
                    pool.matches.forEach(match => {
                        if (match.team_id_a) ids.add(match.team_id_a);
                        if (match.team_id_b) ids.add(match.team_id_b);
                    });
                });
            });
        });
        return Array.from(ids);
    }, [data]);

    // Appeler useTeamsByIds avec l'ensemble complet des IDs (donc toutes les équipes restent observées)
    const {
        teams,
        isLoading: isLoadingTeams,
        isError: isErrorTeams,
        error: errorTeams
    } = useTeamsByIds(allTeamIds);

    // Combiner les états de chargement et d'erreur
    const isLoading = isLoadingMatches || (isLoadingTeams && allTeamIds.length === 0);
    const isFetching = isFetchingNextPage || (isLoadingTeams && allTeamIds.length > 0);
    const isError = isErrorMatches || isErrorTeams;
    const error = errorMatches || errorTeams;

    return {
        dayMatches,         // Tous les matchs (toutes pages)
        teams,              // Toutes les équipes récupérées (de toutes les pages)
        isLoading,
        isFetching,
        isError,
        error,
        fetchNextPage,
        isFetchingNextPage,
        hasNextPage
    };
}