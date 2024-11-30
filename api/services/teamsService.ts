import { Team } from "../../types";
import { AxiosResponse } from "axios";
import { teamsClient } from "../httpClients";

const TeamsService = {
    createTeam: async (team: Partial<Team>): Promise<Team> => {
        const response: AxiosResponse<Team> = await teamsClient.post("/api/teams", team);
        return response.data;
    },

    getAllTeams: async (): Promise<Team[]> => {
        const response: AxiosResponse<Team[]> = await teamsClient.get("/api/teams");
        return response.data;
    },

    getTeamByPoolIdAndTeamName: async (poolId: number, teamName: string): Promise<Team | null> => {
        const response: AxiosResponse<Team | null> = await teamsClient.get("/api/teams/search", {
            params: { pool_id: poolId, team_name: teamName },
        });
        return response.data;
    },

    getTeamsByPool: async (poolId: number): Promise<Team[]> => {
        const response: AxiosResponse<Team[]> = await teamsClient.get(`/api/teams/pool/${poolId}`);
        return response.data;
    },

    getTeamById: async (id: number): Promise<Team | null> => {
        const response: AxiosResponse<Team | null> = await teamsClient.get(`/api/teams/${id}`);
        return response.data;
    },

    updateTeam: async (id: number, updatedTeam: Partial<Team>): Promise<Team> => {
        const response: AxiosResponse<Team> = await teamsClient.put(`/api/teams/${id}`, updatedTeam);
        return response.data;
    },

    deactivateTeam: async (id: number): Promise<void> => {
        await teamsClient.put(`/api/teams/${id}/deactivate`);
    },

    getActiveTeamsByPoolId: async (poolId: number): Promise<Team[]> => {
        const response: AxiosResponse<Team[]> = await teamsClient.get("/api/teams/active", {
            params: { pool_id: poolId },
        });
        return response.data;
    },
};

export default TeamsService;