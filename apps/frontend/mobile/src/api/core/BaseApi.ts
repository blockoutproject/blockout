import { HttpClient, TokenSupplier, createHttpClients } from "./HttpClient";
import { ApiError } from "./ApiError";

export type BaseApiInit = {
    baseURL: string;
    timeout?: number;
};

export class BaseApi {
    protected readonly httpPublic: HttpClient;
    protected readonly httpAuth: HttpClient;

    constructor(init: BaseApiInit) {
        const { publicClient, authClient } = createHttpClients(init.baseURL, {
            timeout: init.timeout,
        });
        this.httpPublic = publicClient;
        this.httpAuth = authClient;
    }

    public setAuthContext(tokenSupplier?: TokenSupplier, onUnauthorized?: (e: ApiError) => void | Promise<void>) {
        this.httpAuth.setAuthContext(tokenSupplier, onUnauthorized);
    }
}
