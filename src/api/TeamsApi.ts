import { CONFIG } from '@/src/config/config';
import AbstractApi from './AbstractApi';
import { Team } from '@/src/types/Team';

class TeamsApi extends AbstractApi {
    private static instance: TeamsApi | null = null;

    private constructor(url: string, token: string) {
        super(url, token);
    }

    /** Initialise l'instance de l'API avec le token d'accès. */
    public static initInstance(token: string): void {
        if (!TeamsApi.instance) {
            TeamsApi.instance = new TeamsApi(CONFIG.API_TEAMS_BASE_URL, token);
        }
    }

    /** Retourne l'instance de l'API. */
    public static getInstance(): TeamsApi {
        if (!TeamsApi.instance) {
            throw new Error('Initialize instance before calling getInstance().');
        }
        return TeamsApi.instance;
    }

    /**
     * Récupère les équipes par leurs identifiants (liste non vide).
     */
    public async getTeamsByIds(ids: number[]): Promise<Team[]> {
        if (ids.length === 0) throw new Error('La liste d’IDs ne peut pas être vide.');

        const response = await this.service.get<Team[]>('/teams', {
            params: { ids: ids.join(',') }
        });
        return response.data;
    }

    /**
     * Recherche des équipes par nom (fuzzy).
     */
    public async searchTeamsByName(query: string): Promise<Team[]> {
        const response = await this.service.get<Team[]>('/teams', {
            params: { name: query }
        });
        return response.data;
    }

    /**
     * Récupère une équipe par son identifiant.
     */
    public async getTeamById(id: number): Promise<Team> {
        const response = await this.service.get<Team>(`/teams/${id}`);
        return response.data;
    }
}

export default TeamsApi;