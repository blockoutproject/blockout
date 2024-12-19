import axios from 'axios';

export const createApiClient = (baseURL: string, accessToken?: string) => {
    const api = axios.create({
        baseURL,
        timeout: 10000,
    });

    api.interceptors.request.use(
        (config) => {
            if (accessToken) {
                config.headers.Authorization = `Bearer ${accessToken}`;
            }
            return config;
        },
        (error) => Promise.reject(error)
    );

    return api;
};