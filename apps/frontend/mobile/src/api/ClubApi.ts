import { CONFIG } from "@/src/config/config";
import { Club } from "../types/Club";
import { CustomImage } from "../types/Common";
import { appendJsonSnake } from "../utils/utils";
import { BaseApi } from "./core/BaseApi";

export class ClubApi extends BaseApi {
    constructor() {
        super({ baseURL: CONFIG.API_GATEWAY_BASE_URL });
    }

    public getClubById(id: string) {
        return this.httpPublic.get<Club>(`/clubs/${id}`);
    }

    public updateClub(
        id: string,
        data: Partial<Club>,
        image?: CustomImage,
    ) {
        const formData = new FormData();
        appendJsonSnake(formData, "data", data);

        formData.append("image", image as any);

        return this.httpAuth.put<Club>(`/clubs/${id}`, formData, {
            headers: { "Content-Type": "multipart/form-data" },
        });
    }
}