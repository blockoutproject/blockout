import { getClubById } from "@/src/shared/generated/endpoints/club-public";
import { updateClub } from "@/src/shared/generated/endpoints/club-secure";
import type { UpdateClubRequest } from "@/src/shared/generated/models";
import type { ImageUpload } from "@/src/shared/model/image-upload";

/** Expose club operations through the feature API boundary. */
export class ClubApi {
  /** Load one public club projection. */
  public getClubById(id: string) {
    return getClubById(id);
  }

  /** Update a club with its optional native image upload. */
  public updateClub(id: string, data: UpdateClubRequest, image?: ImageUpload) {
    return updateClub(id, {
      data: JSON.stringify(data),
      image: image as unknown as Blob | undefined,
    });
  }
}
