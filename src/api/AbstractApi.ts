import axios, {
    AxiosError,
    AxiosInstance,
    AxiosRequestConfig,
    AxiosResponse,
} from 'axios';
import camelcaseKeys from 'camelcase-keys';
import snakecaseKeys from 'snakecase-keys';
import qs from 'qs';

export class ApiError extends Error {
    public readonly status: number;
    public readonly data: any;

    constructor(status: number, message: string, data?: any) {
        super(message);
        this.status = status;
        this.data = data;
        Object.setPrototypeOf(this, ApiError.prototype);
    }
}

type AbstractApiOptions = {
    /** Fournit un token “frais” juste avant chaque requête (ex: getCredentials(undefined, 60)) */
    tokenSupplier?: () => Promise<string | null>;
    /** Appelé sur 401 pour que l’app puisse se déconnecter proprement */
    onUnauthorized?: (err: ApiError) => void | Promise<void>;
    /** Timeout ms */
    timeout?: number;
    /** Nombre max de retries réseau (GET par défaut) */
    retries?: number;
};

export default abstract class AbstractApi {
    protected service: AxiosInstance;
    private onUnauthorized?: (err: ApiError) => void | Promise<void>;
    private tokenSupplier?: () => Promise<string | null>;

    protected constructor(
        url: string,
        bootstrapToken: string,  // token initial (facultatif si tokenSupplier est fourni)
        opts: AbstractApiOptions = {}
    ) {
        if (new.target === AbstractApi) {
            throw new TypeError('Abstract class "AbstractApi" cannot be instantiated directly');
        }

        this.onUnauthorized = opts.onUnauthorized;
        this.tokenSupplier = opts.tokenSupplier;

        const baseAxios = axios.create({
            baseURL: url,
            timeout: opts.timeout ?? 30000,
            headers: {
                ...(bootstrapToken ? { Authorization: `Bearer ${bootstrapToken}` } : {}),
            },
            paramsSerializer: (params) => qs.stringify(params, { arrayFormat: 'repeat' }),
        });

        baseAxios.interceptors.request.use(async (config) => {
            if (this.tokenSupplier) {
                try {
                    const fresh = await this.tokenSupplier();
                    if (fresh) {
                        config.headers = config.headers ?? {};
                        (config.headers as any).Authorization = `Bearer ${fresh}`;
                    }
                } catch {
                    // si le supplier échoue, on laisse passer (la requête échouera possiblement en 401)
                }
            }

            // 2) Transformations snake_case seulement si JSON
            const contentType =
                (config.headers as any)?.['Content-Type'] ??
                (config.headers as any)?.['content-type'];

            const isJson =
                !contentType || String(contentType).toLowerCase().includes('application/json');

            if (isJson) {
                if (config.data && typeof config.data === 'object' && !(config.data instanceof FormData)) {
                    config.data = snakecaseKeys(config.data, { deep: true });
                }
                if (config.params && typeof config.params === 'object') {
                    config.params = snakecaseKeys(config.params, { deep: true });
                }
            }

            return config;
        });

        baseAxios.interceptors.response.use(
            (response: AxiosResponse) => {
                const ct = response.headers?.['content-type'];
                const looksJson = ct && ct.toLowerCase().includes('application/json');
                if (looksJson && response.data && typeof response.data === 'object') {
                    response.data = camelcaseKeys(response.data, { deep: true });
                }
                return response;
            },
            async (err) => this.handleError(err)
        );

        this.service = baseAxios;
    }

    /** Exécute une requête et renvoie directement le corps ou lève un ApiError */
    protected async request<T>(config: AxiosRequestConfig): Promise<T> {
        const response = await this.service.request<T>(config);
        return response.data as T;
    }

    /** Transforme chaque AxiosError en ApiError enrichi */
    private async handleError(error: AxiosError): Promise<never> {
        if (error.response) {
            const status = error.response.status;
            const data = error.response.data as any;

            // Meilleur message (priorité à data.message)
            const serverMessage =
                (typeof data === 'object' && data?.message) || error.message || 'Erreur serveur';

            const apiErr = new ApiError(status, serverMessage, data);

            // Log utile
            const requestId =
                (error.response.headers?.['x-request-id'] || error.response.headers?.['x-correlation-id']);
            console.error('[API Error]', {
                url: error.config?.url,
                method: error.config?.method,
                status,
                requestId,
                data,
                message: serverMessage,
            });

            // Hook 401 → permet de déclencher un signOut propre depuis la couche API
            if (status === 401 && this.onUnauthorized) {
                try { await this.onUnauthorized(apiErr); } catch { /* no-op */ }
            }

            return Promise.reject(apiErr);
        }

        if (error.request) {
            console.error('[API Error] Aucune réponse reçue', {
                url: error.config?.url,
                method: error.config?.method,
            });
            return Promise.reject(new ApiError(0, 'Pas de réponse du serveur'));
        }

        console.error('[API Error] Erreur inconnue', { message: error.message });
        return Promise.reject(new ApiError(0, error.message));
    }
}