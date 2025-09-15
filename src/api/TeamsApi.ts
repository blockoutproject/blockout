import { CONFIG } from '@/src/config/config';
import AbstractApi, { ApiError } from './AbstractApi';
import { Team } from '@/src/types/Team';

type InitOpts = {
    tokenSupplier?: () => Promise<string | null>;
    onUnauthorized?: (e: ApiError) => void | Promise<void>;
};

class TeamsApi extends AbstractApi {
    private static instance: TeamsApi | null = null;

    private constructor(token: string, opts?: InitOpts) {
        super(CONFIG.API_TEAMS_BASE_URL, token, {
            tokenSupplier: opts?.tokenSupplier,
            onUnauthorized: opts?.onUnauthorized,
        });
    }

    /** Initialise l'instance de l'API avec le token d'accès (+ options runtime) */
    public static initInstance(token: string, opts?: InitOpts): void {
        if (!TeamsApi.instance) {
            TeamsApi.instance = new TeamsApi(token, opts);
        }
    }

    /** Retourne l'instance de l'API */
    public static getInstance(): TeamsApi {
        if (!TeamsApi.instance) {
            throw new Error('TEAMS - Initialisez l’instance avant d’appeler getInstance().');
        }
        return TeamsApi.instance;
    }

    /**
     * Récupère les équipes par leurs identifiants
     * @param ids tableau d’identifiants
     */
    public async getTeamsByIds(ids: number[]): Promise<Team[]> {
        if (!ids || ids.length === 0) {
            // plus doux qu’un throw : renvoie un tableau vide si aucun id
            return [];
        }

        try {
            return await this.request<Team[]>({
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

    /**
     * Récupère une équipe par son identifiant
     * @param id identifiant de l’équipe
     */
    public async getTeamById(id: number): Promise<Team | null> {
        try {
            return await this.request<Team>({
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
}

export default TeamsApi;