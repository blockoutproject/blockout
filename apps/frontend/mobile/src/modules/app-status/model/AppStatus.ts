export interface AppStatusResponse {
  maintenance: boolean;
  message: string | null;
  imageUrl: string | null;
  lastUpdate: string | null;
  minVersionIos: string | null;
  minVersionAndroid: string | null;
  storeUrlIos: string | null;
  storeUrlAndroid: string | null;
  forceUpdateMessage: string | null;
}

export interface UpdateAppStatusRequest {
  maintenance?: boolean;
  message?: string | null;
  imageUrl?: string | null;
  minVersionIos?: string | null;
  minVersionAndroid?: string | null;
  storeUrlIos?: string | null;
  storeUrlAndroid?: string | null;
  forceUpdateMessage?: string | null;
}
