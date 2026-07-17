export enum UserRole {
  USER = 'USER',
  ADMIN = 'ADMIN',
}

export enum EntityType {
  TEAM = 'TEAM',
  POOL = 'POOL',
}

export interface CustomUser {
  id: number;
  auth0Id: string;
  email: string;
  pseudo: string;
  pictureUrl: string | null;
  favorites: UserFavorite[] | null;
}

export interface UserFavorite {
  entityType: EntityType;
  entityId: number;
}
