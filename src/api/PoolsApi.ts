import { CONFIG } from '@/src/config/config';
import AbstractApi, { ApiError } from './AbstractApi';
import { Pool } from '@/src/types/Pool';

class PoolsApi extends AbstractApi {
    private static instance: PoolsApi | null = null;

    private constructor(url: string, token: string) {
        super(url, token);
    }

    /** Initialise l'instance de l'API avec le token d'accès */
    public static initInstance(token: string): void {
        if (!PoolsApi.instance) {
            PoolsApi.instance = new PoolsApi(
                CONFIG.API_POOLS_BASE_URL,
                token
            );
        }
    }

    /** Retourne l'instance de l'API */
    public static getInstance(): PoolsApi {
        if (!PoolsApi.instance) {
            throw new Error(
                'Initialisez l’instance avant d’appeler getInstance().'
            );
        }
        return PoolsApi.instance;
    }

    /** Récupère toutes les poules */
    public async getAllPools(): Promise<Pool[]> {
        try {
            return await this.request<Pool[]>({
                method: 'get',
                url: ''
            });
        } catch (error) {
            if (error instanceof ApiError && error.status === 404) {
                return [];
            }
            throw error;
        }
    }

    /** Récupère une poule par son identifiant */
    public async getPoolById(id: number): Promise<Pool | null> {
        try {
            return await this.request<Pool>({
                method: 'get',
                url: `/${id}`
            });
        } catch (error) {
            if (error instanceof ApiError && error.status === 404) {
                return null;
            }
            throw error;
        }
    }

        /**
     * Récupère les poules par leurs identifiants (batch)
     * @param ids tableau d’identifiants
     */
        public async getPoolsByIds(ids: number[]): Promise<Pool[]> {
            if (ids.length === 0) {
                throw new Error('La liste d’IDs ne peut pas être vide.');
            }
    
            try {
                return await this.request<Pool[]>({
                    method: 'get',
                    url: '',
                    params: { ids },
                });
            } catch (error) {
                if (error instanceof ApiError && error.status === 404) {
                    return [];
                }
                throw error;
            }
        }
}

export default PoolsApi;