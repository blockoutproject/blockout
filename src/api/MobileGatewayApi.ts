import { CONFIG } from '@/src/config/config';
import AbstractApi from './AbstractApi';
import { EnrichedDayMatchesDTO, EnrichedMatchDTO, MatchStatus } from '@/src/types/Match';
import { EnrichedPoolDTO } from '../types/Pool';
import { EnrichedTeamDTO } from '../types/Team';

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
            const response = await this.request<EnrichedDayMatchesDTO[]>({
                method: 'get',
                url: '/match-list',
                params: { status, page, size, poolIds, teamIds },
            });
            return response;
        } catch (error) {
            throw error;
        }
    }

    /**
     * Récupère un match enrichi par son ID
     */
    public async getEnrichedMatchById(id: number): Promise<EnrichedMatchDTO> {
        try {
            const response = await this.request<EnrichedMatchDTO>({
                method: 'get',
                url: `/enriched-match/${id}`,
            });
            return response;
        } catch (error) {
            throw error;
        }
    }

    /**
     * Récupère une poule enrichie par son ID
     */
    public async getEnrichedPoolById(id: number): Promise<EnrichedPoolDTO> {
        try {
            const response = await this.request<EnrichedPoolDTO>({
                method: 'get',
                url: `/enriched-pool/${id}`,
            });
            return response;
        } catch (error) {
            throw error;
        }
    }

    /**
     * Récupère une équipe enrichie par son ID
     */
    public async getEnrichedTeamById(id: number): Promise<EnrichedTeamDTO> {
        try {
            const response = await this.request<EnrichedTeamDTO>({
                method: 'get',
                url: `/enriched-team/${id}`,
            });
            return response;
        } catch (error) {
            throw error;
        }
    }
}

export default MobileGatewayApi;