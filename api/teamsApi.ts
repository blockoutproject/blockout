import { CONFIG } from '@/config/config';
import AbstractApi from './AbstractApi';
import { Team } from '@/types/Team';

class TeamsApi extends AbstractApi {
    private static instance: TeamsApi | null = null;

    private constructor(url: string, token: string) {
        super(url, token);
    }

    /**
     * Initialise l'instance de l'API avec le token d'accès.
     * @param token Le token d'accès.
     */
    public static initInstance(token: string): void {
        if (!TeamsApi.instance) {
            TeamsApi.instance = new TeamsApi(CONFIG.API_TEAMS_BASE_URL, token);
        }
    }

    /**
     * Retourne l'instance de l'API.
     * @throws Une erreur si l'instance n'a pas été initialisée.
     */
    public static getInstance(): TeamsApi {
        if (!TeamsApi.instance) {
            throw new Error('Initialize instance before calling getInstance().');
        }
        return TeamsApi.instance;
    }

    /**
     * Récupère les équipes par leurs identifiants.
     * @param ids - Un tableau d'identifiants d'équipes.
     * @returns Un tableau d'équipes correspondant aux identifiants donnés.
     */
    public async getTeamsByIds(ids?: number[]): Promise<Team[]> {
        const params = ids && ids.length > 0 ? { ids: ids.join(',') } : {};
        const response = await this.service.get<Team[]>('/teams', { params });
        return response.data;
    }
}

export default TeamsApi;