import axios, { AxiosInstance } from "axios";
import axiosRetry from "axios-retry";
import axiosConfig from "./axiosConfig";
import authInterceptor from "./interceptors/authInterceptor";
import errorInterceptor from "./interceptors/errorInterceptor";

const createHttpClientWithBaseURL = (baseURL: string): AxiosInstance => {
    const client = axios.create({
        ...axiosConfig, 
        baseURL,
    });

    client.interceptors.request.use(authInterceptor);
    client.interceptors.response.use(
        (response) => response,
        (error) => errorInterceptor(error)
    );

    axiosRetry(client, { retries: 3, retryDelay: axiosRetry.exponentialDelay });

    return client;
};

export default createHttpClientWithBaseURL;