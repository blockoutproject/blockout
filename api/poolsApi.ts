import { CONFIG } from '@/config/config';
import { createApiClient } from '../config/apiClient';
import { Pool } from '../types/Pool';

const api = createApiClient(CONFIG.API_POOLS_BASE_URL);

export const poolsApi = {
    getAllPools: async (): Promise<Pool[]> => {
        const response = await api.get<Pool[]>('/');
        return response.data;
    },

    getPoolById: async (id: number): Promise<Pool> => {
        const response = await api.get<Pool>(`/pools/${id}`);
        return response.data;
    },

    createPool: async (data: Omit<Pool, 'id'>): Promise<Pool> => {
        const response = await api.post<Pool>('/pools', data);
        return response.data;
    },
};