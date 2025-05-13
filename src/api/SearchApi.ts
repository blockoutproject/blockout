import { CONFIG } from '@/src/config/config';
import AbstractApi, { ApiError } from './AbstractApi';
import { TeamSearchDoc } from '../types/docs/TeamSearchDoc';

class SearchApi extends AbstractApi {
    private static instance: SearchApi | null = null;

    private constructor(url: string, token: string) {
        super(url, token);
    }

    /** Initialise l'instance de l'API avec le token d'accès */
    public static initInstance(token: string): void {
        if (!SearchApi.instance) {
            SearchApi.instance = new SearchApi(
                CONFIG.API_SEARCH_BASE_URL,
                token
            );
        }
    }

    /** Retourne l'instance de l'API */
    public static getInstance(): SearchApi {
        if (!SearchApi.instance) {
            throw new Error(
                'Initialisez l’instance avant d’appeler getInstance().'
            );
        }
        return SearchApi.instance;
    }

    /**
     * Recherche des équipes avec ElasticSearch
     * @param query texte de recherche
     */
    public async searchTeams(query: string): Promise<TeamSearchDoc[]> {
        try {
            return await this.request<TeamSearchDoc[]>({
                method: 'get',
                url: 'teams',
                params: { query }
            });
        } catch (error) {
            if (error instanceof ApiError && error.status === 404) {
                return [];
            }
            throw error;
        }
    }
}

export default SearchApi;