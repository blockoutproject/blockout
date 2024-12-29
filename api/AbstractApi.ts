import axios, { AxiosInstance } from 'axios';
import axiosRetry from 'axios-retry';

abstract class AbstractApi {
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

        // Configuration des retries en cas d'erreur réseau
        axiosRetry(this.service, {
            retries: 3,
            retryDelay: axiosRetry.exponentialDelay,
        });
    }
}

export default AbstractApi;