import { CONFIG } from '@/src/config/config';
import AbstractApi, { ApiError } from './AbstractApi';
import {
    CustomUser,
    EntityType,
    UserRegistrationRequest,
    UserFavorite
} from '@/src/types/User';

class UsersApi extends AbstractApi {
    private static instance: UsersApi | null = null;

    private constructor(url: string, token: string) {
        super(url, token);
    }

    /** Initialise l'instance de l'API avec le token d'accès. */
    public static initInstance(token: string): void {
        if (!UsersApi.instance) {
            UsersApi.instance = new UsersApi(
                CONFIG.API_USERS_BASE_URL,
                token
            );
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
     * Ce endpoint est idempotent : aucun changement si les données n'ont pas évolué.
     */
    public async ensureCurrentUser(): Promise<CustomUser> {
        return await this.request<CustomUser>({
            method: 'put',
            url: '/me'
        });
    }

    /**
     * Vérifie si un utilisateur existe dans la base de données.
     * @param auth0Id Identifiant Auth0 de l’utilisateur.
     */
    public async getUserByAuth0Id(auth0Id: string): Promise<CustomUser | null> {
        try {
            return await this.request<CustomUser>({
                method: 'get',
                url: `/${auth0Id}`
            });
        } catch (error) {
            if (error instanceof ApiError && error.status === 404) {
                return null;
            }
            throw error;
        }
    }

    /**
     * Récupère les informations de l'utilisateur courant via le JWT.
     */
    public async getCurrentUser(): Promise<CustomUser | null> {
        try {
            return await this.request<CustomUser>({
                method: 'get',
                url: '/me'
            });
        } catch (error) {
            if (error instanceof ApiError && error.status === 404) {
                return null;
            }
            throw error;
        }
    }

    /**
     * Supprime l’utilisateur actuellement connecté.
     */
    public async deleteCurrentUser(): Promise<void> {
        await this.request<void>({
            method: 'delete',
            url: ''
        });
    }

    /**
     * Suit une entité.
     * @param entityType Type de l’entité à suivre.
     * @param entityId Identifiant de l’entité à suivre.
     */
    public async follow(
        entityType: EntityType,
        entityId: number
    ): Promise<void> {
        await this.request<void>({
            method: 'post',
            url: '/favorites/follow',
            params: { entityType, entityId }
        });
    }

    /**
     * Ne suit plus une entité.
     * @param entityType Type de l’entité à ne plus suivre.
     * @param entityId Identifiant de l’entité à ne plus suivre.
     */
    public async unfollow(
        entityType: EntityType,
        entityId: number
    ): Promise<void> {
        await this.request<void>({
            method: 'delete',
            url: '/favorites/follow',
            params: { entityType, entityId }
        });
    }
}

export default UsersApi;