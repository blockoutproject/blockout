import {
  deleteCurrentUser,
  ensureCurrentUser,
  followFavorite,
  unfollowFavorite,
  updateUser,
} from "@/src/shared/generated/endpoints/user-secure";
import type { UpdateUserRequest } from "@/src/shared/generated/models";
import type { ImageUpload } from "@/src/shared/api/image-upload";

/** Expose user operations through the feature API boundary. */
export class UserApi {
  /** Ensure and load the authenticated gateway user. */
  public ensureCurrentUser() {
    return ensureCurrentUser();
  }

  /** Update a user with an optional native profile image. */
  public updateUser(
    auth0Id: string,
    data: UpdateUserRequest,
    image?: ImageUpload,
  ) {
    return updateUser(auth0Id, {
      data: JSON.stringify(data),
      image: image as unknown as Blob | undefined,
    });
  }

  /** Delete the authenticated gateway user. */
  public deleteCurrentUser() {
    return deleteCurrentUser();
  }

  /** Follow one supported entity. */
  public follow(entityType: string, entityId: number) {
    return followFavorite({ entityType, entityId });
  }

  /** Stop following one supported entity. */
  public unfollow(entityType: string, entityId: number) {
    return unfollowFavorite({ entityType, entityId });
  }
}
