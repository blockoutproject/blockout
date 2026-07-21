import type {
  TeamInternalResponse,
  TeamResponse,
  TeamSummaryResponse,
  UpdateTeamRequest,
} from "@/src/modules/team/model/Team";
import { BaseApi } from "@/src/shared/api/BaseApi";
import { CONFIG } from "@/src/shared/config/config";
import type { ImageUpload } from "@/src/shared/model/ImageUpload";

export class TeamApi extends BaseApi {
  constructor() {
    super({ baseURL: CONFIG.API_GATEWAY_BASE_URL });
  }

  public getTeamById(id: number) {
    return this.httpPublic.get<TeamResponse>(`/teams/${id}`);
  }

  public getTeamsByClubId(clubId: string) {
    return this.httpPublic.get<TeamSummaryResponse[]>(
      `/teams/by-club/${clubId}`,
    );
  }

  public getTeamsByIds(ids: number[]) {
    return this.httpPublic.get<TeamSummaryResponse[]>("/teams/by-ids", {
      params: { ids },
    });
  }

  public updateTeam(id: number, data: UpdateTeamRequest, image?: ImageUpload) {
    const formData = new FormData();
    formData.append("data", JSON.stringify(data));
    if (image) formData.append("image", image as unknown as Blob);

    return this.httpAuth.put<TeamInternalResponse>(`/teams/${id}`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  }
}
