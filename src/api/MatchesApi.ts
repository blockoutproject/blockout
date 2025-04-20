import { CONFIG } from '@/src/config/config';
import AbstractApi from './AbstractApi';
import { DayPageDTO, Match, MatchStatus } from '@/src/types/Match';

class MatchesApi extends AbstractApi {
    private static instance: MatchesApi | null = null;

    private constructor(url: string, token: string) {
        super(url, token);
    }

    /** Initialise l'instance de l'API avec le token d'accès. */
    public static initInstance(token: string): void {
        if (!MatchesApi.instance) {
            MatchesApi.instance = new MatchesApi(CONFIG.API_MATCHES_BASE_URL, token);
        }
    }

    /** Retourne l'instance de l'API. */
    public static getInstance(): MatchesApi {
        if (!MatchesApi.instance) {
            throw new Error('Initialize instance before calling getInstance().');
        }
        return MatchesApi.instance;
    }

    /**
     * Récupère les matchs regroupés par jour.
     * - `poolIds` et `teamIds` sont des tableaux (liste vide ⇒ pas de filtre).
     * - `status` est optionnel (MatchStatus).
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
        const params: Record<string, number | number[] | MatchStatus> = { page, size };

        if (poolIds.length) params.pool_ids = poolIds;
        if (teamIds.length) params.team_ids = teamIds;
        if (status !== undefined) params.status = status;

        const response = await this.service.get('/day-groups', { params });
        return response.data as DayPageDTO;
    }

    /** Récupère un match par ID. */
    public async getMatchById(matchId: number): Promise<Match> {
        const response = await this.service.get(`/matches/${matchId}`);
        return response.data as Match;
    }
}

export default MatchesApi;