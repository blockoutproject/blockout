import { CONFIG } from '@/src/config/config';
import AbstractApi, { ApiError } from './AbstractApi';
import {
    EnrichedDayPageDTO,
    EnrichedMatchDTO,
    MatchStatus,
} from '@/src/types/Match';
import { EnrichedPoolDTO } from '../types/Pool';
import { EnrichedTeamDTO } from '../types/Team';
import { EnrichedUserNotificationPage } from '../types/Notification';

type InitOpts = {
    tokenSupplier?: () => Promise<string | null>;
    onUnauthorized?: (e: ApiError) => void | Promise<void>;
};

class MobileGatewayApi extends AbstractApi {
    private static instance: MobileGatewayApi | null = null;

    private constructor(token: string, opts?: InitOpts) {
        super(CONFIG.API_GATEWAY_BASE_URL, token, {
            tokenSupplier: opts?.tokenSupplier,
            onUnauthorized: opts?.onUnauthorized,
            timeout: 10_000,
        });
    }

    /** Initialise l'instance avec le token d’accès (+ options runtime) */
    public static initInstance(token: string, opts?: InitOpts): void {
        if (!MobileGatewayApi.instance) {
            MobileGatewayApi.instance = new MobileGatewayApi(token, opts);
        }
    }

    /** Retourne l'instance de l’API */
    public static getInstance(): MobileGatewayApi {
        if (!MobileGatewayApi.instance) {
            throw new Error('MOBILEGATEWAY - Initialisez l’instance avant d’appeler getInstance().');
        }
        return MobileGatewayApi.instance;
    }

    /**
     * Récupère la liste des matchs enrichis
     */
    public async getEnrichedMatches({
        page = 0,
        size,
        poolIds,
        teamIds,
        status,
    }: {
        page?: number;
        size?: number;
        poolIds?: number[];
        teamIds?: number[];
        status: MatchStatus;
    }): Promise<EnrichedDayPageDTO> {
        return await this.request<EnrichedDayPageDTO>({
            method: 'get',
            url: '/match-list',
            params: { status, page, size, poolIds, teamIds },
        });
    }

    /**
     * Récupère un match enrichi par son ID
     */
    public async getEnrichedMatchById(id: number): Promise<EnrichedMatchDTO> {
        return await this.request<EnrichedMatchDTO>({
            method: 'get',
            url: `/enriched-match/${id}`,
        });
    }

    /**
     * Récupère une poule enrichie par son ID
     */
    public async getEnrichedPoolById(id: number): Promise<EnrichedPoolDTO> {
        return await this.request<EnrichedPoolDTO>({
            method: 'get',
            url: `/enriched-pool/${id}`,
        });
    }

    /**
     * Récupère une équipe enrichie par son ID
     */
    public async getEnrichedTeamById(id: number): Promise<EnrichedTeamDTO> {
        return await this.request<EnrichedTeamDTO>({
            method: 'get',
            url: `/enriched-team/${id}`,
        });
    }

    /**
     * Récupère les notifications enrichies de l'utilisateur
     */
    public async getEnrichedNotifications({
        page = 0,
        size,
    }: {
        page?: number;
        size?: number;
    }): Promise<EnrichedUserNotificationPage> {
        return await this.request<EnrichedUserNotificationPage>({
            method: 'get',
            url: '/enriched-notifications',
            params: { page, size },
        });
    }
}

export default MobileGatewayApi;