export interface Club {
    id: string;
    rawName: string;
    name: string;
    address: string | null;
    city: string | null;
    postalCode: string | null;
    email: string | null;
    phoneNumber: string | null;
    website: string | null;
    logoUrl: string | null;
    active: boolean;
    latitude: number | null;
    longitude: number | null;
    createdAt: string | null;
    lastUpdate: string | null;
}

export interface ClubSearchDocDTO {
    id: string;
    name: string;
    logoUrl: string | null;
    city: string;
}
