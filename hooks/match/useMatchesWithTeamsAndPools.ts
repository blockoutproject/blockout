// useMatchesWithTeams.ts
import { useMemo } from "react";
import { useMatches } from "./useMatches";
import { useTeamsByIds } from "../team/useTeamsByIds";
import { usePoolsByIds } from "../pool/usePoolsByIds";

export function useMatchesWithTeamsAndPools() {
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

    // Calculer l'union de tous les team IDs depuis toutes les pages fetchées
    const allPoolIds = useMemo(() => {
        if (!data || !data.pages) return [];
        const ids = new Set<number>();
        data.pages.forEach(page => {
            page.day_matches.forEach(day => {
                day.pools.forEach(pool => {
                    if (pool.pool_id) ids.add(pool.pool_id);
                });
            });
        });
        return Array.from(ids);
    }, [data]);

    const {
        teams,
        isLoading: isLoadingTeams,
        isError: isErrorTeams,
        error: errorTeams
    } = useTeamsByIds(allTeamIds);

    const {
        pools,
        isLoading: isLoadingPools,
        isError: isErrorPools,
        error: errorPools
    } = usePoolsByIds(allPoolIds);

    const isLoading = isLoadingMatches || (isLoadingTeams && allTeamIds.length === 0) || (isLoadingPools && allPoolIds.length > 0);
    const isFetching = isFetchingNextPage || (isLoadingTeams && allTeamIds.length > 0) || (isLoadingPools && allPoolIds.length > 0);
    const isError = isErrorMatches || isErrorTeams || isErrorPools;
    const error = errorMatches || errorTeams || errorPools;

    return {
        dayMatches,
        teams,
        pools,
        isLoading,
        isFetching,
        isError,
        error,
        fetchNextPage,
        isFetchingNextPage,
        hasNextPage
    };
}