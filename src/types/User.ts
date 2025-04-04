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
    auth0_id: string;
    email: string;
    pseudo: string;
    first_name?: string;
    last_name?: string;
    picture_url?: string;
    phone_number?: string;
    role: UserRole;
    favorites?: UserFavorite[];
    active: boolean;
    created_at: string;
    last_update: string;
}

export interface UserFavorite {
    entity_type: EntityType;
    entity_id: number;
}

export interface UserRegistrationRequest {
    pseudo: string;
}