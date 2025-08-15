import { CONFIG } from '@/src/config/config';
import AbstractApi, { ApiError } from './AbstractApi';
import { RawDivisionMapping } from '../types/RawDivisionMapping';
import { Division } from '../types/Division';
import { ScraperStatus } from '../types/ScraperStatus';
import { EnumScraperName } from '../types/enums/ScraperName';
import snakecaseKeys from 'snakecase-keys';
import { LegalDocument, LegalDocumentType } from '../types/LegalDocument';

type InitOpts = {
    tokenSupplier?: () => Promise<string | null>;
    onUnauthorized?: (e: ApiError) => void | Promise<void>;
};

class ConfigApi extends AbstractApi {
    private static instance: ConfigApi | null = null;

    private constructor(token: string, opts?: InitOpts) {
        super(CONFIG.API_CONFIG_BASE_URL, token, {
            tokenSupplier: opts?.tokenSupplier,
            onUnauthorized: opts?.onUnauthorized,
        });
    }

    /**
     * Initialise l'instance unique de l'API Config avec un token d'accès.
     * @param token Token JWT Auth0
     */
    public static initInstance(token: string, opts?: InitOpts): void {
        if (!ConfigApi.instance) {
            ConfigApi.instance = new ConfigApi(token, opts);
        }
    }

    /**
     * Retourne l'instance actuelle de l'API Config.
     * @throws Erreur si l'instance n'a pas été initialisée.
     */
    public static getInstance(): ConfigApi {
        if (!ConfigApi.instance) {
            throw new Error('Initialisez l’instance avant d’appeler getInstance().');
        }
        return ConfigApi.instance;
    }

    /**
     * Récupère la liste des mappings raw division pour une ligue et une saison spécifiques.
     * @param leagueCode Code de la ligue
     * @param season Année de la saison
     */
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

    /**
     * Met à jour un mapping raw division existant.
     * @param id Identifiant du mapping
     * @param data Données à modifier
     */
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

    /**
     * Récupère la liste de toutes les divisions.
     */
    public async listDivisions(): Promise<Division[]> {
        return this.request<Division[]>({
            method: 'get',
            url: '/divisions',
        });
    }

    /**
     * Récupère une division par son ID.
     * @param id Identifiant de la division
     */
    public async getDivisionById(id: number): Promise<Division> {
        return this.request<Division>({
            method: 'get',
            url: `/divisions/${id}`,
        });
    }

    /**
     * Crée ou met à jour une division (image optionnelle).
     * @param payload Données de la division
     * @param image Image (React Native): { uri, type?, name? }
     */
    public async createOrUpdateDivision(
        payload: Partial<Division>,
        image?: { uri: string; type?: string; name?: string },
    ): Promise<Division> {
        const formData = new FormData();
        // On snakecase les clés dans le JSON embarqué
        formData.append('data', JSON.stringify(snakecaseKeys(payload, { deep: true })));
        if (image) {
            formData.append('image', {
                uri: image.uri,
                type: image.type ?? 'image/jpeg',
                name: image.name ?? 'division.jpg',
            } as any);
        }

        return this.request<Division>({
            method: 'post',
            url: '/divisions',
            data: formData,
        });
    }

    /**
     * Met à jour une division existante (image optionnelle).
     * @param id Identifiant de la division
     * @param payload Champs à mettre à jour
     * @param image Image (React Native): { uri, type?, name? }
     */
    public async updateDivision(
        id: number,
        payload: Partial<Division>,
        image?: { uri: string; type?: string; name?: string },
    ): Promise<Division> {
        const formData = new FormData();
        formData.append('data', JSON.stringify(snakecaseKeys(payload, { deep: true })));
        if (image) {
            formData.append('image', {
                uri: image.uri,
                type: image.type ?? 'image/jpeg',
                name: image.name ?? 'division.jpg',
            } as any);
        }

        return this.request<Division>({
            method: 'put',
            url: `/divisions/${id}`,
            data: formData,
        });
    }

    /**
     * Désactive une division (soft delete).
     * @param id Identifiant de la division
     */
    public async deactivateDivision(id: number): Promise<void> {
        await this.request<void>({
            method: 'delete',
            url: `/divisions/${id}`,
        });
    }

    /**
     * Récupère la liste des statuts de tous les scrapers.
     */
    public async listScraperStatuses(): Promise<ScraperStatus[]> {
        return this.request<ScraperStatus[]>({
            method: 'get',
            url: '/scrapers/status',
        });
    }

    /**
     * Récupère le statut d’un scraper donné.
     * @param name Nom du scraper
     */
    public async getScraperStatus(name: EnumScraperName): Promise<ScraperStatus> {
        return this.request<ScraperStatus>({
            method: 'get',
            url: `/scrapers/${name}/status`,
        });
    }

    /**
     * Active ou désactive un scraper.
     * @param name Nom du scraper
     * @param enabled Statut à appliquer
     */
    public async updateScraperStatus(name: EnumScraperName, enabled: boolean): Promise<ScraperStatus> {
        return this.request<ScraperStatus>({
            method: 'put',
            url: `/scrapers/${name}/enabled`,
            params: { enabled },
        });
    }

    /**
     * Récupère un document légal (terms, privacy, imprint).
     * @param type Type du document
     */
    public async getLegalDocument(type: LegalDocumentType): Promise<LegalDocument> {
        return this.request<LegalDocument>({
            method: 'get',
            url: `/legal/${type}`,
        });
    }

    /**
     * Met à jour un document légal.
     * @param type Type du document (terms, privacy, imprint)
     * @param data Données à modifier
     */
    public async updateLegalDocument(
        type: LegalDocumentType,
        data: Partial<LegalDocument>
    ): Promise<LegalDocument> {
        return this.request<LegalDocument>({
            method: 'put',
            url: `/legal/${type}`,
            data,
        });
    }
}

export default ConfigApi;