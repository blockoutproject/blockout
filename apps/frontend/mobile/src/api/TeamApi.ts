import {CONFIG} from "@/src/config/config";
import {EnrichedTeamDTO, Team, TeamSummaryDTO} from "@/src/types/Team";
import {CustomImage} from "../types/Common";
import {appendJson} from "../utils/utils";
import {BaseApi} from "./core/BaseApi";

export class TeamApi extends BaseApi {
  constructor() {
    super({baseURL: CONFIG.API_GATEWAY_BASE_URL});
  }

  public getEnrichedTeamById(id: number) {
    return this.httpPublic.get<EnrichedTeamDTO>(`/teams/${id}`);
  }

  public getTeamListByClubId(id: string) {
    return this.httpPublic.get<TeamSummaryDTO[]>(`/teams/by-club/${id}`);
  }

  public getTeamListByIds(ids: number[]) {
    return this.httpPublic.get<TeamSummaryDTO[]>("/teams/by-ids", {params: {ids}});
  }

  public updateTeam(
    id: number,
    data: Partial<Team>,
    image?: CustomImage,
  ) {
    const formData = new FormData();
    appendJson(formData, "data", data);

    formData.append("image", image as any);

    return this.httpAuth.put<Team>(`/teams/${id}`, formData, {
      headers: {"Content-Type": "multipart/form-data"},
    });
  }
}
