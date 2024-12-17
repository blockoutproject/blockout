import { CONFIG } from '@/config/config';
import { createApiClient } from '../config/apiClient';
import { Match } from '../types/Match';
import { PaginatedResponse } from '@/types/Pagination';

const api = createApiClient(CONFIG.API_MATCHES_BASE_URL);

export const matchesApi = {
    getMatches: async ({ page = 0, size = 10 }): Promise<PaginatedResponse<Match>> => {
        const response = await api.get('/matches', {
            params: { page, size },
        });

        const data = response.data;

        return {
            content: data.content,
            totalElements: data.total_elements, 
            totalPages: data.total_pages,
            number: data.number,
            size: data.size,
        };
    },
};