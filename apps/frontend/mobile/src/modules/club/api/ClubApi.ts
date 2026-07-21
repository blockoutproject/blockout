import type {
  ClubResponse,
  UpdateClubRequest,
} from "@/src/modules/club/model/Club";
import { BaseApi } from "@/src/shared/api/BaseApi";
import { CONFIG } from "@/src/shared/config/config";
import type { ImageUpload } from "@/src/shared/model/ImageUpload";

export class ClubApi extends BaseApi {
  constructor() {
    super({ baseURL: CONFIG.API_GATEWAY_BASE_URL });
  }

  public getClubById(id: string) {
    return this.httpPublic.get<ClubResponse>(`/clubs/${id}`);
  }

  public updateClub(id: string, data: UpdateClubRequest, image?: ImageUpload) {
    const formData = new FormData();
    formData.append("data", JSON.stringify(data));
    if (image) formData.append("image", image as unknown as Blob);

    return this.httpAuth.put<ClubResponse>(`/clubs/${id}`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  }
}
