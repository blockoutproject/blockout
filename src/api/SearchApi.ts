import { CONFIG } from '@/src/config/config';
import AbstractApi, { ApiError } from './AbstractApi';
import { TeamSearchDoc } from '../types/docs/TeamSearchDoc';
import { ClubSearchDoc } from '../types/docs/ClubSearchDoc';
import { PoolSearchDoc } from '../types/docs/PoolSearchDoc';

type InitOpts = {
    tokenSupplier?: () => Promise<string | null>;
    onUnauthorized?: (e: ApiError) => void | Promise<void>;
};

class SearchApi extends AbstractApi {
    private static instance: SearchApi | null = null;

    private constructor(token: string, opts?: InitOpts) {
        super(CONFIG.API_SEARCH_BASE_URL, token, {
            tokenSupplier: opts?.tokenSupplier,
            onUnauthorized: opts?.onUnauthorized,
        });
    }

    /** Initialise l'instance de l'API avec le token d'accès (+ options runtime) */
    public static initInstance(token: string, opts?: InitOpts): void {
        if (!SearchApi.instance) {
            SearchApi.instance = new SearchApi(token, opts);
        }
    }

    /** Retourne l'instance de l'API */
    public static getInstance(): SearchApi {
        if (!SearchApi.instance) {
            throw new Error('SEARCH - Initialisez l’instance avant d’appeler getInstance().');
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
                params: { query },
            });
        } catch (error) {
            if (error instanceof ApiError && error.status === 404) {
                return [];
            }
            throw error;
        }
    }

    /**
     * Recherche des clubs avec ElasticSearch
     * @param query texte de recherche
     */
    public async searchClubs(query: string): Promise<ClubSearchDoc[]> {
        try {
            return await this.request<ClubSearchDoc[]>({
                method: 'get',
                url: 'clubs',
                params: { query },
            });
        } catch (error) {
            if (error instanceof ApiError && error.status === 404) {
                return [];
            }
            throw error;
        }
    }

    /**
     * Recherche des pools avec ElasticSearch
     * @param query texte de recherche
     */
    public async searchPools(query: string): Promise<PoolSearchDoc[]> {
        try {
            return await this.request<PoolSearchDoc[]>({
                method: 'get',
                url: 'pools',
                params: { query },
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