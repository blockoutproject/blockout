import { CONFIG } from '@/src/config/config';
import AbstractApi, { ApiError } from './AbstractApi';
import { EnrichedDayMatchesDTO, MatchStatus } from '@/src/types/Match';

type MatchListParams = {
    status: string;
    page?: number;
    size?: number;
    poolIds?: number[];
    teamIds?: number[];
};

class MobileGatewayApi extends AbstractApi {
    private static instance: MobileGatewayApi | null = null;

    private constructor(url: string, token: string) {
        super(url, token);
    }

    /** Initialise l'instance avec le token d’accès */
    public static initInstance(token: string): void {
        if (!MobileGatewayApi.instance) {
            MobileGatewayApi.instance = new MobileGatewayApi(
                CONFIG.API_GATEWAY_BASE_URL,
                token
            );
        }
    }

    /** Retourne l'instance de l’API */
    public static getInstance(): MobileGatewayApi {
        if (!MobileGatewayApi.instance) {
            throw new Error(
                'Initialisez l’instance avant d’appeler getInstance().'
            );
        }
        return MobileGatewayApi.instance;
    }

    /**
     * Récupère la liste des matchs enrichis
     */
    public async getEnrichedMatches({
        page = 0,
        size = 3,
        poolIds,
        teamIds,
        status
    }: {
        page?: number;
        size?: number;
        poolIds?: number[];
        teamIds?: number[];
        status: MatchStatus;
    }): Promise<EnrichedDayMatchesDTO[]> {
        try {
            return await this.request<EnrichedDayMatchesDTO[]>({
                method: 'get',
                url: '/match-list',
                params: { status, page, size, poolIds, teamIds },
            });
        } catch (error) {
            throw error;
        }
    }
}

export default MobileGatewayApi;