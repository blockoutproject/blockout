export enum UserRole {
    USER = "USER",
    ADMIN = "ADMIN"
}

export enum EntityType {
    TEAM = "TEAM",
    POOL = "POOL",
}

export interface CustomUser {
    id: number;
    auth0Id: string;
    email: string;
    pseudo: string;
    firstName: string | null;
    lastName: string | null;
    pictureUrl: string | null;
    phoneNumber: string | null;
    favorites: UserFavorite[] | null;
    active: boolean;
    createdAt: string;
    lastUpdate: string;
}

export interface UserFavorite {
    entityType: EntityType;
    entityId: number;
}

export interface UserRegistrationRequest {
    pseudo: string;
}