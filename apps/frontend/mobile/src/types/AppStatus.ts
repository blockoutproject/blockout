/** Session and administration projection of the canonical mobile app status. */
export interface AppStatusDTO {
  maintenance: boolean;
  message: string | null;
  imageUrl: string | null;
  lastUpdate: string | null;
  minVersionIos: string | null;
  minVersionAndroid: string | null;
  storeUrlIos?: string | null;
  storeUrlAndroid?: string | null;
  forceUpdateMessage?: string | null;
}
