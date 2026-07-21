import {ApiError} from "./ApiError";
import {HttpClient, TokenSupplier} from "./HttpClient";
import {CONFIG} from "@/src/config/config";

/**
 * Un seul registre pour :
 * - httpPublic : toujours dispo
 * - httpAuth   : même instance, auth activée après login (setAuthContext)
 */
class ApiRegistry {
  public readonly httpPublic: HttpClient;
  public readonly httpAuth: HttpClient;

  private constructor() {
    this.httpPublic = new HttpClient({
      baseURL: CONFIG.API_GATEWAY_BASE_URL,
      timeout: 20000,
    });

    this.httpAuth = new HttpClient({
      baseURL: CONFIG.API_GATEWAY_BASE_URL,
      timeout: 20000,
    });
  }

  private static _instance: ApiRegistry;

  public static get instance() {
    if (!this._instance) this._instance = new ApiRegistry();
    return this._instance;
  }

  public setAuthContext(tokenSupplier: TokenSupplier, onUnauthorized?: (e: ApiError) => void | Promise<void>) {
    this.httpAuth.setAuthContext(tokenSupplier, onUnauthorized);
  }

  public clearAuth() {
    this.httpAuth.setAuthContext(undefined, undefined);
  }

  public createPublicClient(baseURL: string) {
    return new HttpClient({baseURL, timeout: 20000});
  }

  public createAuthClient(baseURL: string) {
    return new HttpClient({baseURL, timeout: 20000});
  }
}

export const Api = ApiRegistry.instance;
