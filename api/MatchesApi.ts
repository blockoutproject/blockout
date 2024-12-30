import { CONFIG } from '@/config/config';
import AbstractApi from './AbstractApi';
import { PaginatedResponse } from '@/types/Pagination';
import { Match } from '@/types/Match';

class MatchesApi extends AbstractApi {
    private static instance: MatchesApi | null = null;

    private constructor(url: string, token: string) {
        super(url, token);
    }

    /**
     * Initialise l'instance de l'API avec le token d'accès.
     * @param token Le token d'accès.
     */
    public static initInstance(token: string): void {
        if (!MatchesApi.instance) {
            MatchesApi.instance = new MatchesApi(CONFIG.API_MATCHES_BASE_URL, token);
        }
    }

    /**
     * Retourne l'instance de l'API.
     * @throws Une erreur si l'instance n'a pas été initialisée.
     */
    public static getInstance(): MatchesApi {
        if (!MatchesApi.instance) {
            throw new Error('Initialize instance before calling getInstance().');
        }
        return MatchesApi.instance;
    }

    /**
     * Récupère les matchs avec pagination.
     * @param page - La page demandée.
     * @param size - Le nombre d'éléments par page.
     * @returns Les données paginées des matchs.
     */
    public async getMatches({ page = 0, size = 10 }): Promise<PaginatedResponse<Match>> {
        const response = await this.service.get('/matches', {
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
    }
}

export default MatchesApi;
