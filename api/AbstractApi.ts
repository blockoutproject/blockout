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

        this.service.interceptors.request.use(
            (config) => {
                return config;
            },
            (error) => {
                console.error('Erreur lors de la préparation de la requête :', error);
                return Promise.reject(error);
            }
        );
        
        this.service.interceptors.response.use(
            (response) => {
                return response;
            },
            (error) => {
                if (error.response) {
                    // Erreur côté serveur (statut HTTP)
                    console.error('Erreur de réponse du serveur :', error.response.status, error.response.data);
                } else if (error.request) {
                    // La requête a été envoyée mais aucune réponse n'a été reçue
                    console.error('Aucune réponse reçue :', error.request);
                } else {
                    // Autres erreurs (configuration, etc.)
                    console.error('Erreur Axios :', error.message);
                }
                return Promise.reject(error);
            }
        );

        // Configuration des retries en cas d'erreur réseau
        axiosRetry(this.service, {
            retries: 3,
            retryDelay: axiosRetry.exponentialDelay,
        });
    }
}

export default AbstractApi;