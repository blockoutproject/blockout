import { CONFIG } from '@/src/config/config';
import AbstractApi from './AbstractApi';
import { CustomUser, EntityType, UserRegistrationRequest } from '@/src/types/User';

class UsersApi extends AbstractApi {
    private static instance: UsersApi | null = null;

    private constructor(url: string, token: string) {
        super(url, token);
    }

    /**
     * Initialise l'instance de l'API avec le token d'accès.
     * @param token Le token d'accès.
     */
    public static initInstance(token: string): void {
        if (!UsersApi.instance) {
            UsersApi.instance = new UsersApi(CONFIG.API_USERS_BASE_URL, token);
        }
    }

    /**
     * Retourne l'instance de l'API.
     * @throws Une erreur si l'instance n'a pas été initialisée.
     */
    public static getInstance(): UsersApi {
        if (!UsersApi.instance) {
            throw new Error('Initialize instance before calling getInstance().');
        }
        return UsersApi.instance;
    }

    /**
     * Vérifie si un utilisateur existe dans la base de données.
     * @param auth0Id L'identifiant Auth0 de l'utilisateur.
     * @returns Un objet Promise contenant l'utilisateur s'il existe, null sinon.
     */
    public async getUserByAuth0Id(auth0Id: string): Promise<CustomUser | undefined> {
        try {
            const response = await this.service.get(`/users/auth0/${auth0Id}`);
            return response.data;
        } catch (error: any) {
            if (error.response && error.response.status === 404) {
                return undefined;
            }
            throw error;
        }
    }

    /**
     * Enregistre un nouvel utilisateur dans la base de données.
     * @param registrationData Les données de l'utilisateur (pseudo, email, firstName, lastName).
     * @returns Une Promise contenant l'utilisateur créé (CustomUser).
     */
    public async registerUser(registrationData: UserRegistrationRequest): Promise<CustomUser> {
        const response = await this.service.post('/users', registrationData);
        return response.data;
    }

    /**
     * Suit une entité pour un utilisateur donné.
     * @param userId L'ID de l'utilisateur.
     * @param entityType Le type de l'entité (ex: 'USER', 'POST', etc).
     * @param entityId L'ID de l'entité à suivre.
     */
    public async follow(entityType: EntityType, entityId: number): Promise<void> {
        console.log('Follow', entityType, entityId);
        await this.service.post(`/follows/${entityType}/${entityId}`);
    }

    /**
     * Ne suit plus une entité pour un utilisateur donné.
     * @param userId L'ID de l'utilisateur.
     * @param entityType Le type de l'entité (ex: 'USER', 'POST', etc).
     * @param entityId L'ID de l'entité à ne plus suivre.
     */
    public async unfollow(entityType: EntityType, entityId: number): Promise<void> {
        await this.service.delete(`/follows/${entityType}/${entityId}`);
    }
}

export default UsersApi; 