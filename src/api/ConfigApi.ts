import { CONFIG } from '@/src/config/config';
import AbstractApi from './AbstractApi';
import { RawDivisionMapping } from '../types/RawDivisionMapping';
import { Division } from '../types/Division';

class ConfigApi extends AbstractApi {
    private static instance: ConfigApi | null = null;

    private constructor(url: string, token: string) {
        super(url, token);
    }

    /** Initialise l'instance de l'API avec le token d'accès */
    public static initInstance(token: string): void {
        if (!ConfigApi.instance) {
            ConfigApi.instance = new ConfigApi(CONFIG.API_CONFIG_BASE_URL, token);
        }
    }

    /** Retourne l'instance de l'API */
    public static getInstance(): ConfigApi {
        if (!ConfigApi.instance) {
            throw new Error('Initialisez l’instance avant d’appeler getInstance().');
        }
        return ConfigApi.instance;
    }


    public async listRawDivisionMappings(
        leagueCode?: string,
        season?: number,
    ): Promise<RawDivisionMapping[]> {
        return this.request<RawDivisionMapping[]>({
            method: 'get',
            url: '/raw-divisions',
            params: { leagueCode, season },
        });
    }

    public async updateRawDivisionMapping(
        id: number,
        data: Partial<RawDivisionMapping>,
    ): Promise<RawDivisionMapping> {
        return this.request<RawDivisionMapping>({
            method: 'put',
            url: `/raw-divisions/${id}`,
            data,
        });
    }

    public async listDivisions(): Promise<Division[]> {
        return this.request<Division[]>({
            method: 'get',
            url: '/divisions',
        });
    }

    public async getDivisionById(id: number): Promise<Division> {
        return this.request<Division>({
            method: 'get',
            url: `/divisions/${id}`,
        });
    }

    /**
     * Crée une division (image optionnelle).
     */
    public async createOrUpdateDivision(
        payload: Partial<Division>,
        image?: File,
    ): Promise<Division> {
        const formData = new FormData();

        formData.append('data', JSON.stringify(payload));

        if (image) formData.append('image', image, image.name);

        return this.request<Division>({
            method: 'post',
            url: '/divisions',
            data: formData,
        });
    }

    /**
     * Met à jour une division (image optionnelle).
     */
    public async updateDivision(
        id: number,
        payload: Partial<Division>,
        image?: File,
    ): Promise<Division> {
        const formData = new FormData();

        formData.append('data', JSON.stringify(payload));

        if (image) formData.append('image', image, image.name);

        return this.request<Division>({
            method: 'put',
            url: `/divisions/${id}`,
            data: formData,
        });
    }

    /**
     * Désactive une division.
     */
    public async deactivateDivision(id: number): Promise<void> {
        await this.request<void>({
            method: 'delete',
            url: `/divisions/${id}`,
        });
    }
}

export default ConfigApi;