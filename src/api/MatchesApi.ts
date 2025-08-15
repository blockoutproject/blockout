// src/api/MatchesApi.ts
import { CONFIG } from '@/src/config/config';
import AbstractApi, { ApiError } from './AbstractApi';
import { DayPageDTO, Match, MatchStatus } from '@/src/types/Match';

type InitOpts = {
    tokenSupplier?: () => Promise<string | null>;
    onUnauthorized?: (e: ApiError) => void | Promise<void>;
};

class MatchesApi extends AbstractApi {
    private static instance: MatchesApi | null = null;

    private constructor(token: string, opts?: InitOpts) {
        super(CONFIG.API_MATCHES_BASE_URL, token, {
            tokenSupplier: opts?.tokenSupplier,
            onUnauthorized: opts?.onUnauthorized,
        });
    }

    /** Initialise l'instance de l'API avec le token d'accès */
    public static initInstance(token: string, opts?: InitOpts): void {
        if (!MatchesApi.instance) {
            MatchesApi.instance = new MatchesApi(token, opts);
        }
    }

    /** Retourne l'instance de l'API */
    public static getInstance(): MatchesApi {
        if (!MatchesApi.instance) {
            throw new Error('Initialisez l’instance avant d’appeler getInstance().');
        }
        return MatchesApi.instance;
    }

    /**
     * Récupère les matchs regroupés par jour
     */
    public async getMatches({
        page = 0,
        size = 10,
        poolIds = [],
        teamIds = [],
        status,
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
                    nextPage: 0,
                };
            }
            throw error;
        }
    }

    /**
     * Récupère un match par ID
     */
    public async getMatchById(matchId: number): Promise<Match | null> {
        try {
            return await this.request<Match>({
                method: 'get',
                url: `/${matchId}`,
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