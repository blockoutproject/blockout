import { CONFIG } from '@/src/config/config';
import AbstractApi from './AbstractApi';
import { CompetitionAssociation } from '@/src/types/Competition';

class CompetitionsApi extends AbstractApi {
    private static instance: CompetitionsApi | null = null;

    private constructor(url: string, token: string) {
        super(url, token);
    }

    /** Initialise l'instance avec le token d'accès. */
    public static initInstance(token: string): void {
        if (!CompetitionsApi.instance) {
            CompetitionsApi.instance = new CompetitionsApi(CONFIG.API_COMPETITIONS_BASE_URL, token);
        }
    }

    /** Retourne l'instance. */
    public static getInstance(): CompetitionsApi {
        if (!CompetitionsApi.instance) {
            throw new Error('Initialize instance before calling getInstance().');
        }
        return CompetitionsApi.instance;
    }

    /**
     * Récupère les équipes associées à un pool.
     * @param poolId ID du pool.
     * @param activeOnly true ⇒ seulement les associations actives.
     */
    public async getTeamsAssocByPool(
        poolId: number,
        activeOnly = false
    ): Promise<CompetitionAssociation[]> {
        const params = activeOnly ? { activeOnly: true } : undefined;
        const response = await this.service.get(`/pools/${poolId}/teams`, { params });
        return response.data as CompetitionAssociation[];
    }

    /**
     * Récupère les pools d'une équipe.
     */
    public async getPoolsAssocByTeam(
        teamId: number
    ): Promise<CompetitionAssociation[]> {
        const response = await this.service.get(`/teams/${teamId}/pools`);
        return response.data as CompetitionAssociation[];
    }
}

export default CompetitionsApi;