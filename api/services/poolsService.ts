import { Pool } from "../../types";
import { AxiosResponse } from "axios";
import { poolsClient } from "../httpClients";

const PoolsService = {
  createPool: async (pool: Partial<Pool>): Promise<Pool> => {
    const response: AxiosResponse<Pool> = await poolsClient.post("/api/pools", pool);
    return response.data;
  },

  getAllPools: async (): Promise<Pool[]> => {
    const response: AxiosResponse<Pool[]> = await poolsClient.get("/api/pools");
    return response.data;
  },

  getPoolsByLeagueAndSeason: async (leagueCode: string, season: number): Promise<Pool[]> => {
    const response: AxiosResponse<Pool[]> = await poolsClient.get(
      `/api/pools/league/${leagueCode}/season/${season}`
    );
    return response.data;
  },

  getPoolByCodeLeagueSeason: async (
    poolCode: string,
    leagueCode: string,
    season: number
  ): Promise<Pool | null> => {
    const response: AxiosResponse<Pool | null> = await poolsClient.get(
      `/api/pools/${poolCode}/${leagueCode}/${season}`
    );
    return response.data;
  },

  getPoolById: async (id: number): Promise<Pool | null> => {
    const response: AxiosResponse<Pool | null> = await poolsClient.get(`/api/pools/${id}`);
    return response.data;
  },

  updatePool: async (id: number, updatedPool: Partial<Pool>): Promise<Pool> => {
    const response: AxiosResponse<Pool> = await poolsClient.put(`/api/pools/${id}`, updatedPool);
    return response.data;
  },

  deactivatePool: async (id: number): Promise<void> => {
    await poolsClient.put(`/api/pools/${id}/deactivate`);
  },

  getActivePoolsByLeagueCode: async (leagueCode: string): Promise<Pool[]> => {
    const response: AxiosResponse<Pool[]> = await poolsClient.get(`/api/pools/active`, {
      params: { league_code: leagueCode },
    });
    return response.data;
  },
};

export default PoolsService;