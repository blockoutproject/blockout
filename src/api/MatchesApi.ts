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
            throw new Error('MATCHES - Initialisez l’instance avant d’appeler getInstance().');
        }
        return MatchesApi.instance;
    }

}

export default MatchesApi;