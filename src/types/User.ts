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
    firstName?: string;
    lastName?: string;
    pictureUrl?: string;
    phoneNumber?: string;
    role: UserRole;
    favorites?: UserFavorite[];
    active: boolean;
    createdAt: string;
    lastUpdate: string;
}

export interface UserFavorite {
    id: number;
    entityType: EntityType;
    entityId: number;
    createdAt: string;
}

export interface UserRegistrationRequest {
    pseudo: string;
}