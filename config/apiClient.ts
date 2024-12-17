import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';

// Fonction pour créer une instance Axios avec un `baseURL`
export const createApiClient = (baseURL: string): AxiosInstance => {
    const api = axios.create({
        baseURL,
        timeout: 10000,
    });

    // Intercepteurs pour gérer les erreurs globales ou autres configurations
    api.interceptors.response.use(
        (response) => response,
        (error) => {
            console.error('Erreur API :', error);
            return Promise.reject(error);
        }
    );

    return api;
};