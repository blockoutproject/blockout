import { CONFIG } from '@/config/config';
import AbstractApi from './AbstractApi';
import { DayPageDTO, Match, MatchStatus } from '@/types/Match';

class MatchesApi extends AbstractApi {
    private static instance: MatchesApi | null = null;

    private constructor(url: string, token: string) {
        super(url, token);
    }

    /**
     * Initialise l'instance de l'API avec le token d'accès.
     * @param token Le token d'accès.
     */
    public static initInstance(token: string): void {
        if (!MatchesApi.instance) {
            MatchesApi.instance = new MatchesApi(CONFIG.API_MATCHES_BASE_URL, token);
        }
    }

    /**
     * Retourne l'instance de l'API.
     * @throws Une erreur si l'instance n'a pas été initialisée.
     */    public static getInstance(): MatchesApi {
        if (!MatchesApi.instance) {
            throw new Error('Initialize instance before calling getInstance().');
        }
        return MatchesApi.instance;
    }

    /**
     * Récupère les matchs (optionnel: poolId).
     * - Si `poolId` est fourni, retourne la poule spécifiée.
     * - Sinon, retourne toutes les poules.
     */
    public async getMatches({ page = 0, size = 10, poolId, status }: { page: number, size: number, poolId?: number, status?: MatchStatus}): Promise<DayPageDTO> {
        const params: Record<string, number | MatchStatus> = { page, size };
        if (poolId !== undefined) {
            params.pool_id = poolId;
        }
        if (status !== undefined) {
            params.status = status;
        }

        const response = await this.service.get('/matches/day-based', { params });

        console.log(params, response.data);
        return response.data as DayPageDTO;
    }

    /**
     * Récupère un match spécifique par son ID.
     * @param matchId - L'ID du match à récupérer.
     * @returns Le match correspondant à l'ID donné.
     */
    public async getMatchById(matchId: number): Promise<Match> {
        const response = await this.service.get(`/matches/${matchId}`);
        return response.data as Match;
    }
}

export default MatchesApi;