import axios, {
    AxiosError,
    AxiosHeaders,
    AxiosInstance,
    AxiosRequestConfig,
    AxiosResponse,
} from "axios";
import camelcaseKeys from "camelcase-keys";
import snakecaseKeys from "snakecase-keys";
import qs from "qs";
import { ApiError } from "./ApiError";

export type TokenSupplier = () => Promise<string | null>;

export type HttpClientOptions = {
    baseURL: string;
    timeout?: number;
    transformCase?: boolean;
    tokenSupplier?: TokenSupplier; // si défini -> client AUTH
    onUnauthorized?: (err: ApiError) => void | Promise<void>;
};

export class HttpClient {
    private instance: AxiosInstance;
    private tokenSupplier?: TokenSupplier;
    private onUnauthorized?: (err: ApiError) => void | Promise<void>;
    private transformCase: boolean;

    constructor(opts: HttpClientOptions) {
        this.tokenSupplier = opts.tokenSupplier;
        this.onUnauthorized = opts.onUnauthorized;
        this.transformCase = opts.transformCase ?? true;

        this.instance = axios.create({
            baseURL: opts.baseURL,
            timeout: opts.timeout ?? 20_000,
            paramsSerializer: (params) => qs.stringify(params, { arrayFormat: "repeat" }),
        });

        // Request interceptor (auth + snake_case)
        this.instance.interceptors.request.use(async (config) => {
            const headers = AxiosHeaders.from(config.headers ?? {});
            config.headers = headers;

            // Authorization si client AUTH
            if (this.tokenSupplier) {
                try {
                    const token = await this.tokenSupplier();
                    if (token) headers.set("Authorization", `Bearer ${token}`);
                    else headers.delete("Authorization");

                } catch {
                    headers.delete("Authorization");
                }
            }

            // snake_case pour JSON
            if (this.transformCase) {
                const contentType = headers.get("Content-Type");
                const isJson = !contentType || String(contentType).toLowerCase().includes("application/json");
                if (isJson) {
                    if (config.data && typeof config.data === "object" && !(config.data instanceof FormData)) {
                        config.data = snakecaseKeys(config.data, { deep: true });
                    }
                    if (config.params && typeof config.params === "object") {
                        config.params = snakecaseKeys(config.params, { deep: true });
                    }
                }
            }

            console.log(
                "%c[HTTP REQUEST]",
                "color: #4CAF50; font-weight: bold;",
                {
                    method: config.method?.toUpperCase(),
                    url: `${config.baseURL}${config.url}`,
                    headers: headers,
                    params: config.params,
                    data: config.data instanceof FormData ? "FormData(...)" : config.data,
                    hasToken: headers.has("Authorization"),
                }
            );

            return config;
        });

        // Response interceptor (camelCase + erreurs normalisées)
        this.instance.interceptors.response.use(
            (res: AxiosResponse) => {
                if (this.transformCase) {
                    const ct = res.headers?.["content-type"];
                    const looksJson = ct && ct.toLowerCase().includes("application/json");
                    if (looksJson && res.data && typeof res.data === "object") {
                        res.data = camelcaseKeys(res.data, { deep: true });
                    }
                }
                return res;
            },
            async (err) => this.normalizeError(err)
        );
    }

    public setAuthContext(tokenSupplier?: TokenSupplier, onUnauthorized?: (e: ApiError) => void | Promise<void>) {
        this.tokenSupplier = tokenSupplier;
        this.onUnauthorized = onUnauthorized;
    }

    public get<T>(url: string, config?: AxiosRequestConfig) { return this.request<T>({ ...config, method: "get", url }); }
    public post<T>(url: string, data?: any, config?: AxiosRequestConfig) { return this.request<T>({ ...config, method: "post", url, data }); }
    public put<T>(url: string, data?: any, config?: AxiosRequestConfig) { return this.request<T>({ ...config, method: "put", url, data }); }
    public delete<T>(url: string, config?: AxiosRequestConfig) { return this.request<T>({ ...config, method: "delete", url }); }

    private async request<T>(config: AxiosRequestConfig): Promise<T> {
        try {
            const res = await this.instance.request<T>(config);
            return res.data as T;
        } catch (e: any) {
            const apiErr = e as ApiError;
            if (apiErr.status === 401 && this.onUnauthorized) {
                try { await this.onUnauthorized(apiErr); } catch { /* ignore */ }
            }
            throw apiErr;
        }
    }

    private async normalizeError(error: AxiosError): Promise<never> {
        if (error.response) {
            const status = error.response.status;
            const data = error.response.data as any;
            const message =
                (typeof data === "object" && (data?.message || data?.error)) ||
                error.message ||
                "Erreur serveur";
            const requestId = (error.response.headers?.["x-request-id"] ||
                error.response.headers?.["x-correlation-id"]) as string | undefined;
            const code = (error as any).code ?? (status >= 500 ? "ERR_SERVER" : "ERR_BAD_REQUEST");
            return Promise.reject(new ApiError(status, message, data, { code, requestId }));
        }
        if (error.request) {
            const isTimeout =
                (error as any).code === "ECONNABORTED" ||
                (typeof error.message === "string" && error.message.toLowerCase().includes("timeout"));
            const message = isTimeout ? "Délai dépassé." : "Serveur injoignable.";
            const code = isTimeout ? "ERR_TIMEOUT" : "ERR_NETWORK";
            return Promise.reject(new ApiError(0, message, undefined, { code }));
        }
        return Promise.reject(new ApiError(0, error.message, undefined, { code: (error as any).code }));
    }
}

/**
 * Petit helper pratique : fabrique un couple (public, auth) de clients
 */
export const createHttpClients = (baseURL: string, opts?: { timeout?: number; transformCase?: boolean }) => {
    const publicClient = new HttpClient({ baseURL: `${baseURL}/public`, timeout: opts?.timeout, transformCase: opts?.transformCase });
    const authClient = new HttpClient({ baseURL: `${baseURL}/secure`, timeout: opts?.timeout, transformCase: opts?.transformCase });
    return { publicClient, authClient };
};