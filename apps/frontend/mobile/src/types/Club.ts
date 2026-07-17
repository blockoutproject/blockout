export interface Club {
  id: string;
  rawName: string;
  name: string;
  city: string | null;
  email: string | null;
  /** Intentionally null on the public mobile projection. */
  phoneNumber: string | null;
  website: string | null;
  address: string | null;
  logoUrl: string | null;
  longitude: number | null;
  latitude: number | null;
}

export interface ClubSearchDocDTO {
  id: string;
  name: string;
  logoUrl: string | null;
  city: string;
}
