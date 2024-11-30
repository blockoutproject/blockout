import { Match, MatchStatus } from "../../types";
import { AxiosResponse } from "axios";
import { matchesClient } from "../httpClients";

const MatchesService = {
    createMatch: async (match: Partial<Match>): Promise<Match> => {
        const response: AxiosResponse<Match> = await matchesClient.post("/api/matches", match);
        return response.data;
    },

    getAllMatches: async (): Promise<Match[]> => {
        const response: AxiosResponse<Match[]> = await matchesClient.get("/api/matches");
        return response.data;
    },

    getMatchesByPool: async (poolId: number): Promise<Match[]> => {
        const response: AxiosResponse<Match[]> = await matchesClient.get(`/api/matches/pool/${poolId}`);
        return response.data;
    },

    getMatchByLeagueAndMatchCode: async (leagueCode: string, matchCode: string): Promise<Match | null> => {
        const response: AxiosResponse<Match | null> = await matchesClient.get(`/api/matches/${leagueCode}/${matchCode}`);
        return response.data;
    },

    getMatchById: async (id: number): Promise<Match | null> => {
        const response: AxiosResponse<Match | null> = await matchesClient.get(`/api/matches/${id}`);
        return response.data;
    },

    updateMatch: async (id: number, updatedMatch: Partial<Match>): Promise<Match> => {
        const response: AxiosResponse<Match> = await matchesClient.put(`/api/matches/${id}`, updatedMatch);
        return response.data;
    },

    deactivateMatch: async (id: number): Promise<void> => {
        await matchesClient.put(`/api/matches/${id}/deactivate`);
    },

    getActiveMatchesByPoolId: async (poolId: number): Promise<Match[]> => {
        const response: AxiosResponse<Match[]> = await matchesClient.get(`/api/matches/active`, {
            params: { pool_id: poolId },
        });
        return response.data;
    },

    getStartedMatches: async (status: MatchStatus, active: boolean, currentTime: string): Promise<Match[]> => {
        const response: AxiosResponse<Match[]> = await matchesClient.get(`/api/matches/started`, {
            params: { status, active, current_time: currentTime },
        });
        return response.data;
    },

    getMatchByPoolAndTeamsAndDate: async (
        poolId: number,
        teamIdA: number,
        teamIdB: number,
        matchDate: string
    ): Promise<Match | null> => {
        const response: AxiosResponse<Match | null> = await matchesClient.get(`/api/matches/search`, {
            params: { pool_id: poolId, team_id_a: teamIdA, team_id_b: teamIdB, match_date: matchDate },
        });
        return response.data;
    },
};

export default MatchesService;