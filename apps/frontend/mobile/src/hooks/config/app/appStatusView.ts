import type { MobileAppStatus } from '@/src/api/generated/mobile-gateway/models';
import type { AppStatusDTO } from '@/src/types/AppStatus';

/**
 * Projects the canonical app-status response into the existing session view.
 *
 * @param response - Validated mobile app-status response.
 * @returns Existing app-status view consumed by session and administration flows.
 */
export function toAppStatusView(response: MobileAppStatus): AppStatusDTO {
  return {
    maintenance: response.maintenance,
    message: response.message,
    imageUrl: response.imageUrl,
    lastUpdate: response.lastUpdate,
    minVersionIos: response.minVersionIos,
    minVersionAndroid: response.minVersionAndroid,
    storeUrlIos: response.storeUrlIos,
    storeUrlAndroid: response.storeUrlAndroid,
    forceUpdateMessage: response.forceUpdateMessage,
  };
}
