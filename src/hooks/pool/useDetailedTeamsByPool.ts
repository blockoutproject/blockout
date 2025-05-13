import { useMemo } from "react";
import { useTeamsAssocByPool } from "./useTeamsAssocByPool";
import { useTeamsByIds } from "../team/useTeamsByIds";
import type { TeamWithPoints } from "@/src/types/Team";

export const useDetailedTeamsByPool = (poolId: number) => {
    const {
        data: poolTeams,
        isLoading: isLoadingPoolTeams,
        isSuccess: isSuccessPoolTeams,
        isError: isErrorPoolTeams,
    } = useTeamsAssocByPool(poolId);

    const teamIds = poolTeams?.map(({ teamId }) => teamId) ?? [];

    const {
        entitiesMap: teamsMap,
        isLoading: isLoadingTeams,
        isError: isErrorTeams,
    } = useTeamsByIds(teamIds);

    const teamsWithPoints = useMemo<TeamWithPoints[]>(() => {
        if (!poolTeams) return [];
        return poolTeams
            .map((assoc) => {
                const team = teamsMap[assoc.teamId];
                if (!team) return null;
                return {
                    ...team,
                    points: assoc.points,
                    wins: assoc.wins,
                    losses: assoc.losses,
                    played: assoc.played,
                    pointsPenalty: assoc.pointsPenalty,
                    coefPoints: assoc.coefPoints,
                    coefSets: assoc.coefSets,
                };
            })
            .filter((t): t is TeamWithPoints => t !== null);
    }, [poolTeams, teamsMap]);

    return {
        teams: teamsWithPoints,
        isLoading: isLoadingPoolTeams || isLoadingTeams,
        isError: isErrorPoolTeams || isErrorTeams,
        isSuccess: isSuccessPoolTeams && !isLoadingTeams && !isErrorTeams,
    };
}