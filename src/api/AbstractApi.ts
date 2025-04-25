import axios, { AxiosError, AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import axiosRetry from 'axios-retry';

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
            throw new TypeError('Abstract class "AbstractApi" cannot be instantiated directly');
        }

        this.service = axios.create({
            baseURL: url,
            timeout: timeout,
            headers: {
                Authorization: `Bearer ${token}`,
            },
        });

        // Retry en cas d’erreur réseau/transitoire
        axiosRetry(this.service, {
            retries: 3,
            retryDelay: axiosRetry.exponentialDelay,
        });

        // Intercepteur pour injecter la config de requête
        this.service.interceptors.request.use(
            config => config,
            error => Promise.reject(error)
        );

        // Intercepteur pour capturer et transformer les erreurs
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
            // On force le typage de data en any pour accéder à message
            const data = error.response.data as any;
            console.log(error.response)
            const message =
                data?.message ??
                error.response.statusText ??
                'Erreur inconnue du serveur';
            return Promise.reject(new ApiError(status, message, data));
        }

        if (error.request) {
            return Promise.reject(new ApiError(0, 'Pas de réponse du serveur'));
        }

        return Promise.reject(new ApiError(0, error.message));
    }
}