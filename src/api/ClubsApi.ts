import { CONFIG } from '@/src/config/config';
import AbstractApi, { ApiError } from './AbstractApi';
import { Club } from '../types/Club';
import snakecaseKeys from 'snakecase-keys';

class ClubsApi extends AbstractApi {
    private static instance: ClubsApi | null = null;

    private constructor(url: string, token: string) {
        super(url, token);
    }

    /** Initialise l'instance de l'API avec le token d'accès */
    public static initInstance(token: string): void {
        if (!ClubsApi.instance) {
            ClubsApi.instance = new ClubsApi(CONFIG.API_CLUBS_BASE_URL, token);
        }
    }

    /** Retourne l'instance de l'API */
    public static getInstance(): ClubsApi {
        if (!ClubsApi.instance) {
            throw new Error('Initialisez l’instance avant d’appeler getInstance().');
        }
        return ClubsApi.instance;
    }

    /**
     * Récupère les clubs par leurs identifiants
     * @param ids tableau d’identifiants
     */
    public async getClubsByIds(ids: number[]): Promise<Club[]> {
        if (ids.length === 0) {
            throw new Error('La liste d’IDs ne peut pas être vide.');
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
     * @param data Données à mettre à jour
     * @param image Fichier image (facultatif)
     */
    public async updateClub(
        id: string,
        payload: Partial<Club>,
        image?: File
    ): Promise<Club> {
        const formData = new FormData();

        formData.append('data', JSON.stringify(snakecaseKeys(payload, { deep: true })));

        if (image) formData.append('image', image);

        return this.request<Club>({
            method: 'put',
            url: `/${id}`,
            data: formData,
        });
    }
}

export default ClubsApi;