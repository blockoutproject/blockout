import { CONFIG } from '@/src/config/config';
import AbstractApi, { ApiError } from './AbstractApi';
import { DayPageDTO, Match, MatchStatus } from '@/src/types/Match';

class MatchesApi extends AbstractApi {
    private static instance: MatchesApi | null = null;

    private constructor(url: string, token: string) {
        super(url, token);
    }

    /** Initialise l'instance de l'API avec le token d'accès */
    public static initInstance(token: string): void {
        if (!MatchesApi.instance) {
            MatchesApi.instance = new MatchesApi(
                CONFIG.API_MATCHES_BASE_URL,
                token
            );
        }
    }

    /** Retourne l'instance de l'API */
    public static getInstance(): MatchesApi {
        if (!MatchesApi.instance) {
            throw new Error(
                'Initialisez l’instance avant d’appeler getInstance().'
            );
        }
        return MatchesApi.instance;
    }

    /**
     * Récupère les matchs regroupés par jour
     * @param page numéro de la page (défaut 0)
     * @param size taille de la page (défaut 10)
     * @param poolIds filtres par IDs de poule (tableau vide ⇒ pas de filtre)
     * @param teamIds filtres par IDs d’équipe (tableau vide ⇒ pas de filtre)
     * @param status filtre par statut du match (optionnel)
     */
    public async getMatches({
        page = 0,
        size = 10,
        poolIds = [],
        teamIds = [],
        status
    }: {
        page?: number;
        size?: number;
        poolIds?: number[];
        teamIds?: number[];
        status?: MatchStatus;
    }): Promise<DayPageDTO> {
        try {
            return await this.request<DayPageDTO>({
                method: 'get',
                url: '/day-groups',
                params: { page, size, poolIds, teamIds, status },
            });
        } catch (error) {
            if (error instanceof ApiError && error.status === 404) {
                return {
                    dayMatches: [],
                    hasNext: false,
                    nextPage: 0
                };
            }
            throw error;
        }
    }

    /**
     * Récupère un match par ID
     * @param matchId ID du match
     */
    public async getMatchById(matchId: number): Promise<Match | null> {
        try {
            return await this.request<Match>({
                method: 'get',
                url: `/${matchId}`
            });
        } catch (error) {
            if (error instanceof ApiError && error.status === 404) {
                return null;
            }
            throw error;
        }
    }
}

export default MatchesApi;