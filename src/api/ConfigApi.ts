import { CONFIG } from '@/src/config/config';
import AbstractApi from './AbstractApi';
import { RawDivisionMapping } from '../types/RawDivisionMapping';

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
        console.log('Updating raw division mapping:', id, data);
        return this.request<RawDivisionMapping>({
            method: 'put',
            url: `/raw-divisions/${id}`,
            data
        });
    }
}

export default ConfigApi;