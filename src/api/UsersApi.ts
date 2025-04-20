import { CONFIG } from '@/src/config/config';
import AbstractApi from './AbstractApi';
import { CustomUser, EntityType, UserRegistrationRequest, UserFavorite } from '@/src/types/User';

class UsersApi extends AbstractApi {
    private static instance: UsersApi | null = null;

    private constructor(url: string, token: string) {
        super(url, token);
    }

    /** Initialise l'instance de l'API avec le token d'accès. */
    public static initInstance(token: string): void {
        if (!UsersApi.instance) {
            UsersApi.instance = new UsersApi(CONFIG.API_USERS_BASE_URL, token);
        }
    }

    /** Retourne l'instance de l'API. */
    public static getInstance(): UsersApi {
        if (!UsersApi.instance) {
            throw new Error('Initialize instance before calling getInstance().');
        }
        return UsersApi.instance;
    }

    /**
     * Vérifie si un utilisateur existe dans la base de données.
     * GET /users/{auth0Id}
     */
    public async getUserByAuth0Id(auth0Id: string): Promise<CustomUser | null> {
        try {
            const response = await this.service.get(`/users/${auth0Id}`);
            return response.data;
        } catch (error: any) {
            if (error.response && error.response.status === 404) {
                return null;
            }
            throw error;
        }
    }

    /**
     * Enregistre un nouvel utilisateur.
     * POST /users
     */
    public async registerUser(data: UserRegistrationRequest): Promise<CustomUser> {
        const response = await this.service.post('/users', data);
        return response.data;
    }

    /**
     * Récupère la liste des favoris d'un utilisateur.
     * GET /users/{userId}/favorites[?entityType=...]
     */
    public async getFavorites(userId: number, entityType?: EntityType): Promise<UserFavorite[]> {
        const params = entityType ? { entityType } : undefined;
        const response = await this.service.get<UserFavorite[]>(`/users/${userId}/favorites`, { params });
        return response.data;
    }

    /**
     * Suit une entité.
     * POST /favorites/follow?entityType=...&entityId=...
     */
    public async follow(entityType: EntityType, entityId: number): Promise<void> {
        await this.service.post('/favorites/follow', null, {
            params: { entityType, entityId }
        });
    }

    /**
     * Ne suit plus une entité.
     * DELETE /favorites/follow?entityType=...&entityId=...
     */
    public async unfollow(entityType: EntityType, entityId: number): Promise<void> {
        await this.service.delete('/favorites/follow', {
            params: { entityType, entityId }
        });
    }
}

export default UsersApi;