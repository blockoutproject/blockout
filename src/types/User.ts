export enum UserRole {
    USER = "USER",
    ADMIN = "ADMIN"
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
    active: boolean;
    createdAt?: string;
    lastUpdate?: string;
}

export interface UserRegistrationRequest {
    pseudo: string;
}