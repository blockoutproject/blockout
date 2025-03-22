import { CONFIG } from '@/src/config/config';
import AbstractApi from './AbstractApi';
import { DayPageDTO, Match, MatchStatus } from '@/src/types/Match';

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
     * Récupère les matchs en filtrant éventuellement par plusieurs pools et plusieurs équipes.
     * - `poolIds` et `teamIds` sont des tableaux (liste vide => pas de filtre).
     * - `status` est optionnel (MatchStatus).
     */
    public async getMatches({
        page = 0,
        size = 10,
        poolIds = [],
        teamIds = [],
        status
    }: {
        page?: number,
        size?: number,
        poolIds?: number[],
        teamIds?: number[],
        status?: MatchStatus
    }): Promise<DayPageDTO> {

        // On construit l'objet params en ajoutant seulement ce qui est nécessaire
        const params: Record<string, number | number[] | MatchStatus> = {
            page,
            size
        };

        // Ajout des filtres pools et équipes (sous forme de tableaux)
        if (poolIds.length > 0) {
            params.pool_ids = poolIds;
        }
        if (teamIds.length > 0) {
            params.team_ids = teamIds;
        }

        // Status
        if (status !== undefined) {
            params.status = status;
        }

        const response = await this.service.get('/matches/day-based', { params });
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