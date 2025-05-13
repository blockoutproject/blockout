import { CONFIG } from '@/src/config/config';
import AbstractApi, { ApiError } from './AbstractApi';
import { Team } from '@/src/types/Team';

class TeamsApi extends AbstractApi {
    private static instance: TeamsApi | null = null;

    private constructor(url: string, token: string) {
        super(url, token);
    }

    /** Initialise l'instance de l'API avec le token d'accès */
    public static initInstance(token: string): void {
        if (!TeamsApi.instance) {
            TeamsApi.instance = new TeamsApi(
                CONFIG.API_TEAMS_BASE_URL,
                token
            );
        }
    }

    /** Retourne l'instance de l'API */
    public static getInstance(): TeamsApi {
        if (!TeamsApi.instance) {
            throw new Error(
                'Initialisez l’instance avant d’appeler getInstance().'
            );
        }
        return TeamsApi.instance;
    }

    /**
     * Récupère les équipes par leurs identifiants (liste non vide)
     * @param ids tableau d’identifiants
     */
    public async getTeamsByIds(ids: number[]): Promise<Team[]> {
        if (ids.length === 0) {
            throw new Error('La liste d’IDs ne peut pas être vide.');
        }

        try {
            return await this.request<Team[]>({
                method: 'get',
                url: '',
                params: { ids: ids.join(',') }
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
                url: `/${id}`
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