import { CONFIG } from '@/src/config/config';
import AbstractApi, { ApiError } from './AbstractApi';
import { RegisterPushTokenRequest, UnreadCount } from '../types/Notification';


type InitOpts = {
    tokenSupplier?: () => Promise<string | null>;
    onUnauthorized?: (e: ApiError) => void | Promise<void>;
};

class NotificationsApi extends AbstractApi {
    private static instance: NotificationsApi | null = null;

    private constructor(token: string, opts?: InitOpts) {
        super(CONFIG.API_NOTIFICATIONS_BASE_URL, token, {
            tokenSupplier: opts?.tokenSupplier,
            onUnauthorized: opts?.onUnauthorized,
        });
    }

    /** Initialise l'instance */
    public static initInstance(token: string, opts?: InitOpts): void {
        if (!NotificationsApi.instance) {
            NotificationsApi.instance = new NotificationsApi(token, opts);
        }
    }

    /** Récupère l'instance */
    public static getInstance(): NotificationsApi {
        if (!NotificationsApi.instance) {
            throw new Error("NOTIFICATIONS - Initialisez l’instance avant d’appeler getInstance().");
        }
        return NotificationsApi.instance;
    }

    /** Enregistre/MAJ un push token (déjà présent, je garde) */
    public async registerPushToken(
        userId: number,
        payload: RegisterPushTokenRequest,
    ): Promise<void> {
        try {
            return await this.request<void>({
                method: 'post',
                url: `/users/${userId}/push-tokens`,
                data: payload,
            });
        } catch (error) {
            if (error instanceof ApiError && error.status === 404) {
                return;
            }
            throw error;
        }
    }

    /** Compteur d'UNREAD */
    public async unreadCount(): Promise<number> {
        const res = await this.request<UnreadCount>({
            method: 'get',
            url: '/unread-count',
        });
        return res.count ?? 0;
    }

    /** Marquer une notif en READ */
    public async markRead(id: number): Promise<void> {
        await this.request<void>({
            method: 'post',
            url: `/${id}/read`,
        });
    }

    /** Marquer une notif en OPENED */
    public async markOpened(id: number): Promise<void> {
        await this.request<void>({
            method: 'post',
            url: `/${id}/opened`,
        });
    }

    /** Supprimer une notif */
    public async delete(id: number): Promise<void> {
        await this.request<void>({
            method: 'delete',
            url: `/${id}`,
        });
    }
}

export default NotificationsApi;