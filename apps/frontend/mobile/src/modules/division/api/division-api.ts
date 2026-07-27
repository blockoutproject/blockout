import { listDivisions } from "@/src/shared/generated/endpoints/config-public";
import {
  createDivision,
  deactivateDivision,
  updateDivision,
} from "@/src/shared/generated/endpoints/config-secure";
import type { UpsertDivisionRequest } from "@/src/shared/generated/models";
import type { ImageUpload } from "@/src/shared/api/image-upload";

/** Expose division operations through the feature API boundary. */
export class DivisionApi {
  /** Load every active public division. */
  public getDivisions() {
    return listDivisions();
  }

  /** Create a division with its optional native image upload. */
  public createDivision(data: UpsertDivisionRequest, image?: ImageUpload) {
    return createDivision(toDivisionBody(data, image));
  }

  /** Update a division with its optional native image upload. */
  public updateDivision(
    id: number,
    data: UpsertDivisionRequest,
    image?: ImageUpload,
  ) {
    return updateDivision(id, toDivisionBody(data, image));
  }

  /** Deactivate one division. */
  public deactivateDivision(id: number) {
    return deactivateDivision(id);
  }
}

/** Build the generated multipart body from the feature's native image value. */
function toDivisionBody(data: UpsertDivisionRequest, image?: ImageUpload) {
  return {
    data: JSON.stringify(data),
    image: image as unknown as Blob | undefined,
  };
}
