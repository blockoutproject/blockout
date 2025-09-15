import { CONFIG } from '@/src/config/config';
import AbstractApi, { ApiError } from './AbstractApi';
import { Pool } from '@/src/types/Pool';

type InitOpts = {
    tokenSupplier?: () => Promise<string | null>;
    onUnauthorized?: (e: ApiError) => void | Promise<void>;
};

class PoolsApi extends AbstractApi {
    private static instance: PoolsApi | null = null;

    private constructor(token: string, opts?: InitOpts) {
        super(CONFIG.API_POOLS_BASE_URL, token, {
            tokenSupplier: opts?.tokenSupplier,
            onUnauthorized: opts?.onUnauthorized,
        });
    }

    /** Initialise l'instance de l'API avec le token d'accès (+ options runtime) */
    public static initInstance(token: string, opts?: InitOpts): void {
        if (!PoolsApi.instance) {
            PoolsApi.instance = new PoolsApi(token, opts);
        }
    }

    /** Retourne l'instance de l'API */
    public static getInstance(): PoolsApi {
        if (!PoolsApi.instance) {
            throw new Error('POOLS - Initialisez l’instance avant d’appeler getInstance().');
        }
        return PoolsApi.instance;
    }

    /** Récupère toutes les poules */
    public async getAllPools(): Promise<Pool[]> {
        try {
            return await this.request<Pool[]>({
                method: 'get',
                url: '',
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
                url: `/${id}`,
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
        if (!ids || ids.length === 0) {
            // plus doux qu'un throw — on renvoie un tableau vide
            return [];
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