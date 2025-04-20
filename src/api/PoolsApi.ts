import { CONFIG } from '@/src/config/config';
import AbstractApi from './AbstractApi';
import { Pool } from '@/src/types/Pool';

class PoolsApi extends AbstractApi {
    private static instance: PoolsApi | null = null;

    private constructor(url: string, token: string) {
        super(url, token);
    }

    /** Initialise l'instance de l'API avec le token d'accès. */
    public static initInstance(token: string): void {
        if (!PoolsApi.instance) {
            PoolsApi.instance = new PoolsApi(CONFIG.API_POOLS_BASE_URL, token);
        }
    }

    /** Retourne l'instance de l'API. */
    public static getInstance(): PoolsApi {
        if (!PoolsApi.instance) {
            throw new Error('Initialize instance before calling getInstance().');
        }
        return PoolsApi.instance;
    }

    /** Récupère toutes les poules. */
    public async getAllPools(): Promise<Pool[]> {
        const response = await this.service.get<Pool[]>('/pools');
        return response.data;
    }

    /** Récupère une poule par son identifiant. */
    public async getPoolById(id: number): Promise<Pool> {
        const response = await this.service.get<Pool>(`/pools/${id}`);
        return response.data;
    }
}

export default PoolsApi;