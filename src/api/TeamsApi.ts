import { CONFIG } from '@/src/config/config';
import AbstractApi from './AbstractApi';
import { Team } from '@/src/types/Team';

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
     * Récupère les équipes par leurs identifiants (liste non vide).
     * @param ids - Tableau d'identifiants d'équipes (doit être non vide).
     * @returns Un tableau d'équipes correspondant aux identifiants donnés.
     * @throws Erreur si `ids` est vide.
     */
    public async getTeamsByIds(ids: number[]): Promise<Team[]> {
        const params = { ids: ids.join(',') };

        const response = await this.service.post<Team[]>('/teams/by-ids', null, { params });
        return response.data;
    }

    /**
     * Recherche des équipes par nom (fuzzy).
     * @param query - Le texte saisi à rechercher partiellement.
     * @returns Une promesse contenant la liste des équipes trouvées.
     */
    public async searchTeamsByName(query: string): Promise<Team[]> {
        const response = await this.service.get<Team[]>('/teams/by-name', {
            params: { query }
        });
        return response.data;
    }   

    /**
     * Récupère une équipe par son identifiant.
     * @param id - L'identifiant de l'équipe.
     * @returns Une promesse renvoyant l'équipe correspondante.
     */
    public async getTeamById(id: number): Promise<Team> {
        const response = await this.service.get<Team>(`/teams/${id}`);
        return response.data;
    }
}

export default TeamsApi;
