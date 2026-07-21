import {
  AxiosHeaders,
  AxiosInstance,
  AxiosRequestConfig,
  create,
  isAxiosError,
} from "axios";
import qs from "qs";
import {ApiError} from "./ApiError";

export type TokenSupplier = () => Promise<string | null>;

export type HttpClientOptions = {
  baseURL: string;
  timeout?: number;
  tokenSupplier?: TokenSupplier;
  onUnauthorized?: (err: ApiError) => void | Promise<void>;
};

export class HttpClient {
  private instance: AxiosInstance;
  private tokenSupplier?: TokenSupplier;
  private onUnauthorized?: (err: ApiError) => void | Promise<void>;

  constructor(opts: HttpClientOptions) {
    this.tokenSupplier = opts.tokenSupplier;
    this.onUnauthorized = opts.onUnauthorized;

    this.instance = create({
      baseURL: opts.baseURL,
      timeout: opts.timeout ?? 20_000,
      paramsSerializer: (params) => qs.stringify(params, {arrayFormat: "repeat"}),
    });

    this.instance.interceptors.request.use(async (config) => {
      const headers = AxiosHeaders.from(config.headers ?? {});
      config.headers = headers;

      if (this.tokenSupplier) {
        try {
          const token = await this.tokenSupplier();
          if (token) {
            headers.set("Authorization", `Bearer ${token}`);
          } else {
            headers.delete("Authorization");
          }
        } catch {
          headers.delete("Authorization");
        }
      }

      return config;
    });

    this.instance.interceptors.response.use(
      (res) => res,
      async (err) => this.normalizeError(err)
    );
  }

  public setAuthContext(tokenSupplier?: TokenSupplier, onUnauthorized?: (e: ApiError) => void | Promise<void>) {
    this.tokenSupplier = tokenSupplier;
    this.onUnauthorized = onUnauthorized;
  }

  public get<T>(url: string, config?: AxiosRequestConfig) {
    return this.request<T>({...config, method: "get", url});
  }

  public post<T>(url: string, data?: unknown, config?: AxiosRequestConfig) {
    return this.request<T>({...config, method: "post", url, data});
  }

  public put<T>(url: string, data?: unknown, config?: AxiosRequestConfig) {
    return this.request<T>({...config, method: "put", url, data});
  }

  public delete<T>(url: string, config?: AxiosRequestConfig) {
    return this.request<T>({...config, method: "delete", url});
  }

  private async request<T>(config: AxiosRequestConfig): Promise<T> {
    try {
      const res = await this.instance.request<T>(config);
      return res.data as T;
    } catch (error: unknown) {
      if (error instanceof ApiError && error.status === 401 && this.onUnauthorized) {
        try {
          await this.onUnauthorized(error);
        } catch {
          // Authentication cleanup must not replace the original API failure.
        }
      }
      throw error;
    }
  }

  private normalizeError(error: unknown): never {
    if (!isAxiosError(error)) {
      throw new ApiError(
        0,
        error instanceof Error ? error.message : "Une erreur inattendue est survenue.",
      );
    }

    if (error.response) {
      const status = error.response.status;
      const data = error.response.data;
      const responseMessage =
        typeof data === "object" && data !== null
          ? ("message" in data && typeof data.message === "string" && data.message) ||
            ("error" in data && typeof data.error === "string" && data.error)
          : undefined;
      const message =
        responseMessage ||
        error.message ||
        "Erreur serveur";
      const requestId = (error.response.headers?.["x-request-id"] ||
        error.response.headers?.["x-correlation-id"]) as string | undefined;
      const code = error.code ?? (status >= 500 ? "ERR_SERVER" : "ERR_BAD_REQUEST");
      throw new ApiError(status, message, data, {code, requestId});
    }
    if (error.request) {
      const isTimeout =
        error.code === "ECONNABORTED" ||
        (typeof error.message === "string" && error.message.toLowerCase().includes("timeout"));
      const message = isTimeout ? "Délai dépassé." : "Serveur injoignable.";
      const code = isTimeout ? "ERR_TIMEOUT" : "ERR_NETWORK";
      throw new ApiError(0, message, undefined, {code});
    }
    throw new ApiError(0, error.message, undefined, {code: error.code});
  }
}

export const createHttpClients = (baseURL: string, opts?: { timeout?: number }) => {
  const publicClient = new HttpClient({baseURL: `${baseURL}/public`, timeout: opts?.timeout});
  const authClient = new HttpClient({baseURL: `${baseURL}/secure`, timeout: opts?.timeout});
  return {publicClient, authClient};
};
