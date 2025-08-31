import axios, {
    AxiosError,
    AxiosInstance,
    AxiosRequestConfig,
    AxiosResponse,
} from "axios";
import camelcaseKeys from "camelcase-keys";
import snakecaseKeys from "snakecase-keys";
import qs from "qs";

/** Erreur enrichie et normalisée */
export class ApiError extends Error {
    public readonly status: number;
    public readonly data: any;
    /** Code générique: ERR_NETWORK | ERR_TIMEOUT | ERR_SERVER | ERR_BAD_REQUEST | ... */
    public readonly code?: string;
    /** Aide au handling côté UI */
    public readonly isNetwork?: boolean;
    public readonly isTimeout?: boolean;
    /** Pour corrélation logs */
    public readonly requestId?: string;

    constructor(
        status: number,
        message: string,
        data?: any,
        meta?: { code?: string; isNetwork?: boolean; isTimeout?: boolean; requestId?: string }
    ) {
        super(message);
        this.status = status;
        this.data = data;
        this.code = meta?.code;
        this.isNetwork = meta?.isNetwork;
        this.isTimeout = meta?.isTimeout;
        this.requestId = meta?.requestId;
        Object.setPrototypeOf(this, ApiError.prototype);
    }
}

type AbstractApiOptions = {
    /** Fournit un token “frais” juste avant chaque requête */
    tokenSupplier?: () => Promise<string | null>;
    /** Appelé sur 401 pour que l’app puisse se déconnecter proprement */
    onUnauthorized?: (err: ApiError) => void | Promise<void>;
    /** Timeout ms par défaut (peut être override par requête) */
    timeout?: number;
    /** Nombre max de retries réseau (par défaut pour GET/HEAD) */
    retries?: number;
};

type RequestOptions = {
    /** Overrides de retry pour CETTE requête */
    retries?: number;
    /** Forcer idempotence (autorise retry) */
    idempotent?: boolean;
};

function sleep(ms: number) {
    return new Promise((r) => setTimeout(r, ms));
}

function isMethodIdempotent(method?: string) {
    const m = (method ?? "get").toUpperCase();
    return m === "GET" || m === "HEAD" || m === "OPTIONS";
}

function isTransientStatus(status: number) {
    // timeouts/réseau => status 0 géré ailleurs
    return status === 408 || status === 429 || status === 425 || status === 500 || status === 502 || status === 503 || status === 504;
}

export default abstract class AbstractApi {
    protected service: AxiosInstance;

    private onUnauthorized?: (err: ApiError) => void | Promise<void>;
    private tokenSupplier?: () => Promise<string | null>;
    private defaultTimeout: number;
    private defaultRetries: number;

    protected constructor(
        url: string,
        bootstrapToken: string,
        opts: AbstractApiOptions = {}
    ) {
        if (new.target === AbstractApi) {
            throw new TypeError('Abstract class "AbstractApi" cannot be instantiated directly');
        }

        this.onUnauthorized = opts.onUnauthorized;
        this.tokenSupplier = opts.tokenSupplier;
        this.defaultTimeout = opts.timeout ?? 20_000;
        this.defaultRetries = opts.retries ?? 0;

        const baseAxios = axios.create({
            baseURL: url,
            timeout: this.defaultTimeout,
            headers: {
                ...(bootstrapToken ? { Authorization: `Bearer ${bootstrapToken}` } : {}),
            },
            paramsSerializer: (params) => qs.stringify(params, { arrayFormat: "repeat" }),
        });

        // --- Request interceptor ---
        baseAxios.interceptors.request.use(async (config) => {
            if (this.tokenSupplier) {
                try {
                    const fresh = await this.tokenSupplier();
                    if (fresh) {
                        config.headers = config.headers ?? {};
                        (config.headers as any).Authorization = `Bearer ${fresh}`;
                    }
                } catch {
                    // Token frais indispo → on laisse passer (possibilité de 401 derrière)
                }
            }

            // Transformations snake_case seulement si JSON
            const contentType =
                (config.headers as any)?.["Content-Type"] ??
                (config.headers as any)?.["content-type"];

            const isJson =
                !contentType || String(contentType).toLowerCase().includes("application/json");

            if (isJson) {
                if (config.data && typeof config.data === "object" && !(config.data instanceof FormData)) {
                    config.data = snakecaseKeys(config.data, { deep: true });
                }
                if (config.params && typeof config.params === "object") {
                    config.params = snakecaseKeys(config.params, { deep: true });
                }
            }

            return config;
        });

        // --- Response interceptor ---
        baseAxios.interceptors.response.use(
            (response: AxiosResponse) => {
                const ct = response.headers?.["content-type"];
                const looksJson = ct && ct.toLowerCase().includes("application/json");
                if (looksJson && response.data && typeof response.data === "object") {
                    response.data = camelcaseKeys(response.data, { deep: true });
                }
                return response;
            },
            async (err) => this.handleError(err)
        );

        this.service = baseAxios;
    }

    /** Exécute une requête, gère un retry simple (GET/HEAD par défaut), renvoie `data` ou lève un ApiError */
    protected async request<T>(config: AxiosRequestConfig, opts: RequestOptions = {}): Promise<T> {
        const retries = opts.retries ?? this.defaultRetries;
        const idempotent = opts.idempotent ?? isMethodIdempotent(config.method);
        const timeout = config.timeout ?? this.defaultTimeout;

        let attempt = 0;
        // backoff exponentiel avec jitter
        const backoff = (n: number) => {
            const base = 300 * Math.pow(2, n); // 300ms, 600ms, 1200ms...
            const jitter = Math.floor(Math.random() * 150);
            return base + jitter;
        };

        // On attrape ici l'erreur *après* normalisation par handleError
        while (true) {
            try {
                const response = await this.service.request<T>({ ...config, timeout });
                return response.data as T;
            } catch (e: any) {
                const apiErr = e as ApiError;

                // Hook 401 → signOut propre
                if (apiErr.status === 401 && this.onUnauthorized) {
                    try {
                        await this.onUnauthorized(apiErr);
                    } catch { /* no-op */ }
                }

                const transient = apiErr.status === 0 /* réseau/timeout */ || isTransientStatus(apiErr.status);
                const canRetry = idempotent && transient && attempt < retries;

                if (!canRetry) {
                    throw apiErr;
                }

                await sleep(backoff(attempt));
                attempt += 1;
                continue;
            }
        }
    }

    /** Transforme chaque AxiosError en ApiError enrichi */
    private async handleError(error: AxiosError): Promise<never> {
        // Réponse HTTP reçue
        if (error.response) {
            const status = error.response.status;
            const data = error.response.data as any;

            const serverMessage =
                (typeof data === "object" && data?.message) ||
                error.message ||
                "Erreur serveur";

            const requestId =
                (error.response.headers?.["x-request-id"] ||
                    error.response.headers?.["x-correlation-id"]);

            const code =
                (error as any).code ??
                (status >= 500 ? "ERR_SERVER" : "ERR_BAD_REQUEST");

            const apiErr = new ApiError(status, serverMessage, data, {
                code,
                requestId,
            });

            console.error("[API Error]", {
                url: error.config?.url,
                method: error.config?.method,
                status,
                requestId,
                data,
                message: serverMessage,
            });

            return Promise.reject(apiErr);
        }

        // Requête émise mais **aucune réponse** (reverse proxy down, DNS, CORS, offline…)
        if (error.request) {
            const isTimeout =
                (error as any).code === "ECONNABORTED" ||
                (typeof error.message === "string" && error.message.toLowerCase().includes("timeout"));

            const code = isTimeout ? "ERR_TIMEOUT" : "ERR_NETWORK";
            const message = isTimeout
                ? "Délai dépassé. Le serveur ne répond pas."
                : "Serveur injoignable. Vérifie ta connexion ou réessaie plus tard.";

            console.error("[API Error] Aucune réponse reçue", {
                url: error.config?.url,
                method: error.config?.method,
                code,
            });

            return Promise.reject(
                new ApiError(0, message, undefined, {
                    code,
                    isNetwork: !isTimeout,
                    isTimeout,
                })
            );
        }

        // Erreur de config / autre
        console.error("[API Error] Erreur inconnue", { message: error.message, code: (error as any).code });
        return Promise.reject(new ApiError(0, error.message, undefined, { code: (error as any).code }));
    }
}