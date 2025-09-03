import { CONFIG } from '@/src/config/config';
import AbstractApi, { ApiError } from './AbstractApi';

// Enums / Types
export enum DevicePlatform {
    IOS = 'IOS',
    ANDROID = 'ANDROID',
    WEB = 'WEB',
    UNKNOWN = 'UNKNOWN',
}

export interface RegisterPushTokenRequest {
    expoPushToken: string;
    platform: DevicePlatform;
    deviceId?: string | null;
}

type InitOpts = {
    tokenSupplier?: () => Promise<string | null>;
    onUnauthorized?: (e: ApiError) => void | Promise<void>;
};

// Client API Notifications
class NotificationsApi extends AbstractApi {
    private static instance: NotificationsApi | null = null;

    private constructor(token: string, opts?: InitOpts) {
        super(CONFIG.API_NOTIFICATIONS_BASE_URL, token, {
            tokenSupplier: opts?.tokenSupplier,
            onUnauthorized: opts?.onUnauthorized,
        });
    }

    /** Init l'API */
    public static initInstance(token: string, opts?: InitOpts): void {
        if (!NotificationsApi.instance) {
            NotificationsApi.instance = new NotificationsApi(token, opts);
        }
    }

    /** Récupère l'instance */
    public static getInstance(): NotificationsApi {
        if (!NotificationsApi.instance) {
            throw new Error('Initialisez l’instance avant d’appeler getInstance().');
        }
        return NotificationsApi.instance;
    }

    /** Enregistre/MAJ un push token */
    public async registerPushToken(
        userId: number,
        payload: RegisterPushTokenRequest,
    ): Promise<void> {
        try {
            await this.request<void>({
                method: 'post',
                url: `/users/${userId}/push-tokens`,
                data: payload,
            });
        } catch (error) {
            if (error instanceof ApiError && error.status === 404) {
                // Utilisateur introuvable
                return;
            }
            throw error;
        }
    }
}

export default NotificationsApi;