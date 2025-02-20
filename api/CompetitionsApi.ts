import { CONFIG } from '@/config/config';
import AbstractApi from './AbstractApi';
import { CompetitionAssociation } from '@/types/Competition';

class CompetitionsApi extends AbstractApi {
    private static instance: CompetitionsApi | null = null;

    private constructor(url: string, token: string) {
        super(url, token);
    }

    /**
     * Initialise l'instance de l'API avec le token d'accès.
     * @param token Le token d'accès.
     */
    public static initInstance(token: string): void {
        if (!CompetitionsApi.instance) {
            CompetitionsApi.instance = new CompetitionsApi(CONFIG.API_COMPETITIONS_BASE_URL, token);
        }
    }

    /**
     * Retourne l'instance de l'API.
     * @throws Une erreur si l'instance n'a pas été initialisée.
     */    public static getInstance(): CompetitionsApi {
        if (!CompetitionsApi.instance) {
            throw new Error('Initialize instance before calling getInstance().');
        }
        return CompetitionsApi.instance;
    }

    /**
     * Récupère les équipes associées à un pool spécifique.
     * @param poolId - L'ID du pool à récupérer.
     * @returns Une liste des entrées d'équipes dans le pool.
     */
    public async getTeamsByPool(poolId: number): Promise<CompetitionAssociation[]> {
        const response = await this.service.get(`/pools/${poolId}/teams`);
        return response.data as CompetitionAssociation[];
    }


    /**
     * Récupère les poules auxquelles une équipe est rattachée.
     * @param teamId - L'ID de l'équipe à rechercher.
     * @returns Une liste des poules où l'équipe est engagée.
     */
    public async getPoolsByTeam(teamId: number): Promise<CompetitionAssociation[]> {
        const response = await this.service.get(`/teams/${teamId}/pools`);
        return response.data as CompetitionAssociation[];
    }
}

export default CompetitionsApi;