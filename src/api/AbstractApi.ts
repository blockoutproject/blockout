import axios, {
    AxiosError,
    AxiosInstance,
    AxiosRequestConfig,
    AxiosResponse,
} from 'axios';
import axiosRetry from 'axios-retry';
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

export default abstract class AbstractApi {
    protected service: AxiosInstance;

    protected constructor(
        url: string,
        token: string,
        timeout: number = 30000
    ) {
        if (new.target === AbstractApi) {
            throw new TypeError(
                'Abstract class "AbstractApi" cannot be instantiated directly'
            );
        }

        const baseAxios = axios.create({
            baseURL: url,
            timeout,
            headers: {
                Authorization: `Bearer ${token}`,
            },
            paramsSerializer: (params) =>
                qs.stringify(params, { arrayFormat: 'repeat' }),
        });

        // Middleware manuel de conversion des keys
        baseAxios.interceptors.request.use((config) => {
            if (config.data && typeof config.data === 'object' && !(config.data instanceof FormData)) {
                config.data = snakecaseKeys(config.data, { deep: true });
            }
            if (config.params && typeof config.params === 'object') {
                config.params = snakecaseKeys(config.params, { deep: true });
            }

            return config;
        });

        baseAxios.interceptors.response.use(
            (response: AxiosResponse) => {
                if (response.data && typeof response.data === 'object') {
                    response.data = camelcaseKeys(response.data, { deep: true });
                }
                return response;
            },
            this.handleError.bind(this)
        );

        this.service = baseAxios;
    }

    /** Exécute une requête et renvoie directement le corps ou lève un ApiError */
    protected async request<T>(config: AxiosRequestConfig): Promise<T> {
        const response = await this.service.request<T>(config);
        return response.data;
    }

    /** Transforme chaque AxiosError en ApiError enrichi */
    private handleError(error: AxiosError): Promise<never> {
        if (error.response) {
            const status = error.response.status;
            const data = error.response.data;
            const message = error.message ?? 'Erreur inconnue du serveur';

            console.error('[API Error]', {
                url: error.config?.url,
                method: error.config?.method,
                status,
                data,
                message,
            });

            return Promise.reject(new ApiError(status, message, data));
        }

        if (error.request) {
            console.error('[API Error] Aucune réponse reçue', {
                url: error.config?.url,
                method: error.config?.method,
                request: error.request,
            });

            return Promise.reject(new ApiError(0, 'Pas de réponse du serveur'));
        }

        console.error('[API Error] Erreur inconnue', {
            message: error.message,
        });

        return Promise.reject(new ApiError(0, error.message));
    }
}