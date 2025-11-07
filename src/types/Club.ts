export interface Club {
    id: string;
    rawName: string;
    name: string;
    city: string | null;
    postalCode: string | null;
    email: string | null;
    phoneNumber: string | null;
    website: string | null;
    logoUrl: string | null;
    active: boolean;
    createdAt: string;
    lastUpdate: string;
}

export interface ClubSearchDocDTO {
    id: string;
    name: string;
    logoUrl: string | null;
    city: string;
}   