import axios, {
    AxiosError,
    AxiosInstance,
    AxiosRequestConfig,
} from 'axios';
import axiosRetry from 'axios-retry';
import applyCaseMiddleware from 'axios-case-converter'; // 👈 ajoute ça

// Erreur métier enrichie
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

    protected constructor(url: string, token: string, timeout: number = 60000) {
        if (new.target === AbstractApi) {
            throw new TypeError(
                'Abstract class "AbstractApi" cannot be instantiated directly'
            );
        }

        // Applique le middleware de case conversion
        const baseAxios = axios.create({
            baseURL: url,
            timeout: timeout,
            headers: {
                Authorization: `Bearer ${token}`,
            },
        });

        this.service = applyCaseMiddleware(baseAxios, {
            ignoreHeaders: true, // headers comme Authorization ne sont pas modifiés
        });

        // Retry en cas d’erreur réseau/transitoire
        axiosRetry(this.service, {
            retries: 3,
            retryDelay: axiosRetry.exponentialDelay,
        });

        // Intercepteur requête
        this.service.interceptors.request.use(
            config => config,
            error => Promise.reject(error)
        );

        // Intercepteur réponse
        this.service.interceptors.response.use(
            response => response,
            this.handleError.bind(this)
        );
    }

    /** Exécute une requête et renvoie directement le corps ou lève un ApiError */
    protected async request<T>(config: AxiosRequestConfig): Promise<T> {
        const response = await this.service.request<T>(config);
        return response.data;
    }

    /** Transforme chaque AxiosError en ApiError avec statut et payload */
    private handleError(error: AxiosError): Promise<never> {
        if (error.response) {
            const status = error.response.status;
            const data = error.response.data as any;
            const message = error.message ?? 'Erreur inconnue du serveur';
            return Promise.reject(new ApiError(status, message, data));
        }

        if (error.request) {
            return Promise.reject(new ApiError(0, 'Pas de réponse du serveur'));
        }

        return Promise.reject(new ApiError(0, error.message));
    }
}