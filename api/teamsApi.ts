import { CONFIG } from '@/config/config';
import { createApiClient } from '../config/apiClient';
import { Team } from '../types/Team';

const api = createApiClient(CONFIG.API_TEAMS_BASE_URL);

export const teamsApi = {
    getTeamsByIds: async (ids?: number[]): Promise<Team[]> => {
        const params = ids && ids.length > 0 ? { ids: ids.join(',') } : {};
        const response = await api.get<Team[]>('/teams', { params });
        return response.data;
    },
};