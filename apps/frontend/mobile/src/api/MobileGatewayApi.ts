import { ApiError } from '@/src/api/core/ApiError';
import type { TokenSupplier } from '@/src/api/core/orvalAxios';

/** Compatibility shell retained until the generated-only API provider cleanup task. */
export class MobileGatewayApi {
  /**
   * Keeps the provider interface stable while generated auth is configured separately.
   *
   * @param tokenSupplier authenticated access-token supplier.
   * @param onUnauthorized shared unauthorized-session callback.
   */
  public setAuthContext(
    tokenSupplier?: TokenSupplier,
    onUnauthorized?: (e: ApiError) => void | Promise<void>,
  ) {
    void tokenSupplier;
    void onUnauthorized;
  }
}
