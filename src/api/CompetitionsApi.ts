import { CONFIG } from '@/src/config/config';
import AbstractApi, { ApiError } from './AbstractApi';
import { CompetitionAssociation } from '@/src/types/Competition';

class CompetitionsApi extends AbstractApi {
    private static instance: CompetitionsApi | null = null;

    private constructor(url: string, token: string) {
        super(url, token);
    }

    /** Initialise l'instance avec le token d'accès */
    public static initInstance(token: string): void {
        if (!CompetitionsApi.instance) {
            CompetitionsApi.instance = new CompetitionsApi(
                CONFIG.API_COMPETITIONS_BASE_URL,
                token
            );
        }
    }

    /** Retourne l'instance de l'API */
    public static getInstance(): CompetitionsApi {
        if (!CompetitionsApi.instance) {
            throw new Error(
                'Initialisez l’instance avant d’appeler getInstance().'
            );
        }
        return CompetitionsApi.instance;
    }

    /**
     * Récupère les équipes associées à un pool
     * @param poolId ID du pool
     * @param activeOnly true ⇒ seulement les associations actives
     */
    public async getTeamsAssocByPool(
        poolId: number,
        activeOnly = false
    ): Promise<CompetitionAssociation[]> {
        try {
            return await this.request<CompetitionAssociation[]>({
                method: 'get',
                url: `/pools/${poolId}/teams`,
                params: activeOnly ? { active_only: true } : undefined,
            });
        } catch (error) {
            if (error instanceof ApiError && error.status === 404) {
                return [];
            }
            throw error;
        }
    }

    /**
     * Récupère les pools d'une équipe
     * @param teamId ID de l’équipe
     */
    public async getPoolsAssocByTeam(
        teamId: number
    ): Promise<CompetitionAssociation[]> {
        try {
            return await this.request<CompetitionAssociation[]>({
                method: 'get',
                url: `/teams/${teamId}/pools`,
            });
        } catch (error) {
            if (error instanceof ApiError && error.status === 404) {
                return [];
            }
            throw error;
        }
    }
}

export default CompetitionsApi;