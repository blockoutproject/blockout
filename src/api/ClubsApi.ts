import { CONFIG } from '@/src/config/config';
import AbstractApi, { ApiError } from './AbstractApi';
import { Club } from '../types/Club';
import snakecaseKeys from 'snakecase-keys';

type InitOpts = {
    tokenSupplier?: () => Promise<string | null>;
    onUnauthorized?: (e: ApiError) => void | Promise<void>;
};

class ClubsApi extends AbstractApi {
    private static instance: ClubsApi | null = null;

    private constructor(token: string, opts?: InitOpts) {
        super(CONFIG.API_CLUBS_BASE_URL, token, {
            tokenSupplier: opts?.tokenSupplier,
            onUnauthorized: opts?.onUnauthorized,
        });
    }

    /** Initialise l'instance de l'API avec le token d'accès (et options runtime) */
    public static initInstance(token: string, opts?: InitOpts): void {
        if (!ClubsApi.instance) {
            ClubsApi.instance = new ClubsApi(token, opts);
        }
    }

    /** Retourne l'instance de l'API */
    public static getInstance(): ClubsApi {
        if (!ClubsApi.instance) {
            throw new Error('Initialisez l’instance via ClubsApi.initInstance(...) avant getInstance().');
        }
        return ClubsApi.instance;
    }

    /**
     * Récupère les clubs par leurs identifiants
     * @param ids tableau d’identifiants
     */
    public async getClubsByIds(ids: number[]): Promise<Club[]> {
        if (!ids || ids.length === 0) {
            // plus soft: on retourne un tableau vide plutôt que throw
            return [];
        }

        try {
            return await this.request<Club[]>({
                method: 'get',
                url: '',
                params: { ids },
            });
        } catch (error) {
            if (error instanceof ApiError && error.status === 404) {
                return [];
            }
            throw error;
        }
    }

    /**
     * Récupère un club par son ID
     * @param id ID du club
     */
    public async getClubById(id: string): Promise<Club> {
        return await this.request<Club>({
            method: 'get',
            url: `/${id}`,
        });
    }

    /**
     * Met à jour un club avec ses nouvelles données (et un logo facultatif)
     * @param id ID du club
     * @param payload Données à mettre à jour
     * @param image Image (React Native friendly) { uri, type?, name? }
     */
    public async updateClub(
        id: string,
        payload: Partial<Club>,
        image?: { uri: string; type?: string; name?: string }
    ): Promise<Club> {
        const formData = new FormData();

        // Comme on envoie du FormData, l'interceptor JSON ne snakecase pas.
        // On snakecase donc explicitement l'objet avant de le stringify.
        formData.append('data', JSON.stringify(snakecaseKeys(payload, { deep: true })));

        if (image) {
            formData.append('image', {
                uri: image.uri,
                type: image.type ?? 'image/jpeg',
                name: image.name ?? 'club-logo.jpg',
            } as any);
        }

        return this.request<Club>({
            method: 'put',
            url: `/${id}`,
            data: formData,
        });
    }
}

export default ClubsApi;