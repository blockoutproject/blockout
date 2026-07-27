import {
  getTeamById,
  getTeamsByClubId,
  getTeamsByIds,
} from "@/src/shared/generated/endpoints/team-public";
import { updateTeam } from "@/src/shared/generated/endpoints/team-secure";
import type { UpdateTeamRequest } from "@/src/shared/generated/models";
import type { ImageUpload } from "@/src/shared/api/image-upload";

/** Expose team operations through the feature API boundary. */
export class TeamApi {
  /** Load one public team projection. */
  public getTeamById(id: number) {
    return getTeamById(id);
  }

  /** Load public team summaries for one club. */
  public getTeamsByClubId(clubId: string) {
    return getTeamsByClubId(clubId);
  }

  /** Load public team summaries for the requested identifiers. */
  public getTeamsByIds(ids: number[]) {
    return getTeamsByIds({ ids });
  }

  /** Update one team with its optional native image upload. */
  public updateTeam(id: number, data: UpdateTeamRequest, image?: ImageUpload) {
    return updateTeam(id, {
      data: JSON.stringify(data),
      image: image as unknown as Blob | undefined,
    });
  }
}
