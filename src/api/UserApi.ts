import { CONFIG } from "@/src/config/config";
import { CustomUser } from "../types/User";
import { CustomImage } from "../types/Common";
import { appendJsonSnake } from "../utils/utils";
import { BaseApi } from "./core/BaseApi";

export class UserApi extends BaseApi {
    constructor() {
        super({ baseURL: CONFIG.API_GATEWAY_BASE_URL });
    }

    public ensureCurrentUser(): Promise<CustomUser> {
        return this.httpAuth.put<CustomUser>("/users/me");
    }

    public updateUser(
        auth0Id: string,
        data: Partial<CustomUser>,
        image?: CustomImage,
    ): Promise<CustomUser> {
        const formData = new FormData();
        appendJsonSnake(formData, "data", data);

        formData.append("image", image as any);

        return this.httpAuth.put<CustomUser>(`/users/${auth0Id}`, formData, {
            headers: { "Content-Type": "multipart/form-data" },
        });
    }

    public deleteCurrentUser(): Promise<void> {
        return this.httpAuth.delete<void>("/users/me");
    }

    public follow(entityType: string, entityId: number) {
        return this.httpAuth.post<void>("/users/favorites/follow", null, {
            params: { entity_type: entityType, entity_id: entityId },
        });
    }

    public unfollow(entityType: string, entityId: number) {
        return this.httpAuth.delete<void>("/users/favorites/follow", {
            params: { entity_type: entityType, entity_id: entityId },
        });
    }
}