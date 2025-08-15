import { CONFIG } from '@/src/config/config';
import AbstractApi, { ApiError } from './AbstractApi';
import {
    CustomUser,
    EntityType,
    UserRegistrationRequest,
    UserFavorite,
} from '@/src/types/User';

type InitOpts = {
    tokenSupplier?: () => Promise<string | null>;
    onUnauthorized?: (e: ApiError) => void | Promise<void>;
};

class UsersApi extends AbstractApi {
    private static instance: UsersApi | null = null;

    private constructor(token: string, opts?: InitOpts) {
        super(CONFIG.API_USERS_BASE_URL, token, {
            tokenSupplier: opts?.tokenSupplier,
            onUnauthorized: opts?.onUnauthorized,
        });
    }

    /** Initialise l'instance de l'API avec le token d'accès (+ options runtime). */
    public static initInstance(token: string, opts?: InitOpts): void {
        if (!UsersApi.instance) {
            UsersApi.instance = new UsersApi(token, opts);
        }
    }

    /** Retourne l'instance de l'API. */
    public static getInstance(): UsersApi {
        if (!UsersApi.instance) {
            throw new Error('Initialisez l’instance avant d’appeler getInstance().');
        }
        return UsersApi.instance;
    }

    /**
     * Crée ou met à jour l'utilisateur courant à partir du profil Auth0.
     * Endpoint idempotent : aucun changement si les données n'ont pas évolué.
     */
    public async ensureCurrentUser(): Promise<CustomUser> {
        return await this.request<CustomUser>({
            method: 'put',
            url: '/me',
        });
    }

    /**
     * Supprime l’utilisateur actuellement connecté.
     */
    public async deleteCurrentUser(): Promise<void> {
        await this.request<void>({
            method: 'delete',
            url: '/me',
        });
    }

    /**
     * Suit une entité.
     */
    public async follow(entityType: EntityType, entityId: number): Promise<void> {
        await this.request<void>({
            method: 'post',
            url: '/favorites/follow',
            params: { entityType, entityId },
        });
    }

    /**
     * Ne suit plus une entité.
     */
    public async unfollow(entityType: EntityType, entityId: number): Promise<void> {
        await this.request<void>({
            method: 'delete',
            url: '/favorites/follow',
            params: { entityType, entityId },
        });
    }

    /**
     * Met à jour un utilisateur (photo optionnelle).
     * ⚠️ En React Native, passe une image au format { uri, type?, name? }.
     */
    public async updateUser(
        auth0Id: string,
        data: Record<string, any>,
        image?: { uri: string; type?: string; name?: string }
    ): Promise<CustomUser> {
        const formData = new FormData();
        formData.append('data', JSON.stringify(data));

        if (image) {
            formData.append('image', {
                uri: image.uri,
                type: image.type ?? 'image/jpeg',
                name: image.name ?? 'profile.jpg',
            } as any);
        }

        return await this.request<CustomUser>({
            method: 'put',
            url: `/${auth0Id}`,
            data: formData,
        });
    }
}

export default UsersApi;