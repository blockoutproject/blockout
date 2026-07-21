export enum EntityType {
  TEAM = "TEAM",
  POOL = "POOL",
}

export interface UserResponse {
  id: number;
  auth0Id: string;
  email: string;
  pseudo: string;
  firstName: string | null;
  lastName: string | null;
  pictureUrl: string | null;
  phoneNumber: string | null;
  favorites: UserFavoriteResponse[] | null;
  active: boolean;
  createdAt: string;
  lastUpdate: string;
}

export interface UserFavoriteResponse {
  entityType: EntityType;
  entityId: number;
}

export type UpdateUserRequest = {
  pseudo?: string;
  pictureUrl?: string | null;
};
