import {CONFIG} from "@/src/shared/config/config";
import {UserResponse, UpdateUserRequest} from "@/src/modules/user/model/User";
import {CustomImage} from "@/src/types/Common";
import {BaseApi} from "@/src/shared/api/BaseApi";

export class UserApi extends BaseApi {
  constructor() {
    super({baseURL: CONFIG.API_GATEWAY_BASE_URL});
  }

  public ensureCurrentUser(): Promise<UserResponse> {
    return this.httpAuth.put<UserResponse>("/users/me");
  }

  public updateUser(
    auth0Id: string,
    data: UpdateUserRequest,
    image?: CustomImage,
  ): Promise<UserResponse> {
    const formData = new FormData();
    formData.append("data", JSON.stringify(data));
    if (image) formData.append("image", image as unknown as Blob);

    return this.httpAuth.put<UserResponse>(`/users/${auth0Id}`, formData, {
      headers: {"Content-Type": "multipart/form-data"},
    });
  }

  public deleteCurrentUser(): Promise<void> {
    return this.httpAuth.delete<void>("/users/me");
  }

  public follow(entityType: string, entityId: number) {
    return this.httpAuth.post<void>("/favorites/follow", null, {
      params: {entityType, entityId},
    });
  }

  public unfollow(entityType: string, entityId: number) {
    return this.httpAuth.delete<void>("/favorites/follow", {
      params: {entityType, entityId},
    });
  }
}
