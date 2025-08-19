import { CONFIG } from '@/src/config/config';
import AbstractApi, { ApiError } from './AbstractApi';
import snakecaseKeys from 'snakecase-keys';
import { GitHubIssueResponse, Report } from '../types/Report';

type InitOpts = {
    tokenSupplier?: () => Promise<string | null>;
    onUnauthorized?: (e: ApiError) => void | Promise<void>;
};

class ReportsApi extends AbstractApi {
    private static instance: ReportsApi | null = null;

    private constructor(token: string, opts?: InitOpts) {
        super(CONFIG.API_REPORTS_BASE_URL, token, {
            tokenSupplier: opts?.tokenSupplier,
            onUnauthorized: opts?.onUnauthorized,
        });
    }

    /** Initialise l'instance de l'API avec le token d'accès (et options runtime) */
    public static initInstance(token: string, opts?: InitOpts): void {
        if (!ReportsApi.instance) {
            ReportsApi.instance = new ReportsApi(token, opts);
        }
    }

    /** Retourne l'instance de l'API */
    public static getInstance(): ReportsApi {
        if (!ReportsApi.instance) {
            throw new Error('Initialisez l’instance via ReportsApi.initInstance(...) avant getInstance().');
        }
        return ReportsApi.instance;
    }

    /**
     * Crée un report (issue GitHub)
     * @param payload données du report
     * @param images images à joindre (optionnel)
     */
    public async createReport(
        payload: Partial<Report>,
        images?: { uri: string; type?: string; name?: string }[]
    ): Promise<GitHubIssueResponse> {
        const formData = new FormData();

        formData.append('data', JSON.stringify(snakecaseKeys(payload, { deep: true })));

        if (images && images.length > 0) {
            images.forEach((img, i) => {
                formData.append('images', {
                    uri: img.uri,
                    type: img.type ?? 'image/jpeg',
                    name: img.name ?? `report-image-${i + 1}.jpg`,
                } as any);
            });
        }

        return this.request<GitHubIssueResponse>({
            method: 'post',
            url: '',
            data: formData,
        });
    }
}

export default ReportsApi;