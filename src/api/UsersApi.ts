import { CONFIG } from "@/src/config/config";
import AbstractApi, { ApiError } from "./AbstractApi";
import type { CustomUser, EntityType } from "@/src/types/User";

type InitOpts = {
    tokenSupplier?: () => Promise<string | null>;
    onUnauthorized?: (e: ApiError) => void | Promise<void>;
};

class UsersApi extends AbstractApi {
    private static instance: UsersApi | null = null;

    private constructor(token: string, opts?: InitOpts) {
        super(CONFIG.API_USERS_BASE_URL, token, {
            tokenSupplier: opts?.tokenSupplier,
            onUnauthorized: opts?.onUnauthorized,
            retries: 2,
        });
    }

    public static initInstance(token: string, opts?: InitOpts): void {
        if (!UsersApi.instance) {
            UsersApi.instance = new UsersApi(token, opts);
        }
    }

    public static getInstance(): UsersApi {
        if (!UsersApi.instance) {
            throw new Error("Initialisez l’instance avant d’appeler getInstance().");
        }
        return UsersApi.instance;
    }

    public async ensureCurrentUser(): Promise<CustomUser> {
        return await this.request<CustomUser>(
            {
                method: "put",
                url: "/me",
                timeout: 5_000,
            }
        );
    }

    public async deleteCurrentUser(): Promise<void> {
        await this.request<void>({ method: "delete", url: "/me" }, { retries: 0 });
    }

    public async follow(entityType: EntityType, entityId: number): Promise<void> {
        await this.request<void>({
            method: "post",
            url: "/favorites/follow",
            params: { entityType, entityId },
        });
    }

    public async unfollow(entityType: EntityType, entityId: number): Promise<void> {
        await this.request<void>({
            method: "delete",
            url: "/favorites/follow",
            params: { entityType, entityId },
        });
    }

    public async updateUser(
        auth0Id: string,
        data: Record<string, any>,
        image?: { uri: string; type?: string; name?: string }
    ): Promise<CustomUser> {
        const formData = new FormData();
        formData.append("data", JSON.stringify(data));
        if (image) {
            formData.append("image", {
                uri: image.uri,
                type: image.type ?? "image/jpeg",
                name: image.name ?? "profile.jpg",
            } as any);
        }

        return await this.request<CustomUser>(
            {
                method: "put",
                url: `/${auth0Id}`,
                data: formData,
                headers: { "Content-Type": "multipart/form-data" },
                timeout: 10_000,
            },
            { retries: 1 }
        );
    }
}

export default UsersApi;