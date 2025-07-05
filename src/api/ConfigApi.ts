import { CONFIG } from '@/src/config/config';
import AbstractApi from './AbstractApi';
import { RawDivisionMapping } from '../types/RawDivisionMapping';
import { Division } from '../types/Division';

class ConfigApi extends AbstractApi {
    private static instance: ConfigApi | null = null;

    private constructor(url: string, token: string) {
        super(url, token);
    }

    /** Initialise l'instance de l'API Config avec le token d'accès. */
    public static initInstance(token: string): void {
        if (!ConfigApi.instance) {
            ConfigApi.instance = new ConfigApi(
                CONFIG.API_CONFIG_BASE_URL,
                token
            );
        }
    }

    /** Retourne l'instance de l'API Config. */
    public static getInstance(): ConfigApi {
        if (!ConfigApi.instance) {
            throw new Error('Initialisez l’instance avant d’appeler getInstance().');
        }
        return ConfigApi.instance;
    }

    /**
     * Récupère les mappings non complétés (ou tous les mappings si filtres non précisés).
     * @param leagueCode Code de la ligue.
     * @param season Saison concernée.
     */
    public async listRawDivisionMappings(leagueCode?: string, season?: number): Promise<RawDivisionMapping[]> {
        return this.request<RawDivisionMapping[]>({
            method: 'get',
            url: '/raw-divisions',
            params: { league_code: leagueCode, season }
        });
    }

    /**
     * Met à jour un mapping de poule.
     * @param id Identifiant du mapping.
     * @param data Données à mettre à jour (divisionName, format, gender).
     */
    public async updateRawDivisionMapping(id: number, data: Partial<RawDivisionMapping>): Promise<RawDivisionMapping> {
        return this.request<RawDivisionMapping>({
            method: 'put',
            url: `/raw-divisions/${id}`,
            data
        });
    }

    /**
     * Récupère la liste complète des divisions (actives et inactives).
     */
    public async listDivisions(): Promise<Division[]> {
        return this.request<Division[]>({
            method: 'get',
            url: '/divisions'
        });
    }

    /**
     * Récupère une division par son identifiant.
     * @param id ID de la division.
     */
    public async getDivisionById(id: number): Promise<Division> {
        return this.request<Division>({
            method: 'get',
            url: `/divisions/${id}`
        });
    }

    /**
     * Crée une division avec image (optionnelle).
     */
    public async createOrUpdateDivision(
        data: Partial<Division>,
        image?: File
    ): Promise<Division> {
        const formData = new FormData();

        Object.entries(data).forEach(([key, value]) => {
            if (value !== undefined && value !== null) {
                formData.append(key, String(value));
            }
        });

        if (image) {
            formData.append('image', image);
        }

        return this.request<Division>({
            method: 'post',
            url: '/divisions',
            data: formData,
        });
    }

    /**
     * Met à jour une division avec une image (optionnelle).
     */
    public async updateDivision(
        id: number,
        data: Partial<Division>,
        image?: File
    ): Promise<Division> {
        const formData = new FormData();

        Object.entries(data).forEach(([key, value]) => {
            if (value !== undefined && value !== null) {
                formData.append(key, String(value));
            }
        });

        if (image) {
            formData.append('image', image);
        }

        return this.request<Division>({
            method: 'put',
            url: `/divisions/${id}`,
            data: formData,
        });
    }

    /**
     * Désactive une division.
     * @param id ID de la division.
     */
    public async deactivateDivision(id: number): Promise<void> {
        await this.request<void>({
            method: 'delete',
            url: `/divisions/${id}`
        });
    }
}

export default ConfigApi;