import {
  getAppStatus,
  getLegalDocument,
  listDivisions,
} from "@/src/shared/generated/endpoints/config-public";
import {
  createDivision,
  deactivateDivision,
  listRawDivisions,
  listScraperStatuses,
  updateAppStatus,
  updateDivision,
  updateLegalDocument,
  updateRawDivision,
  updateScraperStatus,
} from "@/src/shared/generated/endpoints/config-secure";
import type {
  UpdateAppStatusRequest,
  UpdateLegalDocumentRequest,
  UpdateRawDivisionMappingRequest,
  UpsertDivisionRequest,
} from "@/src/shared/generated/models";
import type {ImageUpload} from "@/src/shared/model/ImageUpload";

/** Expose configuration operations through the feature API boundary. */
export class ConfigApi {
  /** Load a public legal document. */
  public getLegalDocument(type: string) {
    return getLegalDocument(type);
  }

  /** Update a legal document. */
  public updateLegalDocument(type: string, data: UpdateLegalDocumentRequest) {
    return updateLegalDocument(type, data);
  }

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

  /** Load raw division mappings matching the optional provider filters. */
  public getRawDivisionMappings(leagueCode?: string, season?: string) {
    return listRawDivisions({leagueCode, season});
  }

  /** Update one raw division mapping. */
  public updateRawDivisionMapping(
    id: number,
    data: UpdateRawDivisionMappingRequest,
  ) {
    return updateRawDivision(id, data);
  }

  /** Enable or disable one scraper schedule. */
  public updateScraperStatus(name: string, enabled: boolean) {
    return updateScraperStatus(name, {enabled});
  }

  /** Load all scraper statuses. */
  public getScraperStatuses() {
    return listScraperStatuses();
  }

  /** Load the public application status. */
  public getAppStatus() {
    return getAppStatus();
  }

  /** Update the application status. */
  public updateAppStatus(data: UpdateAppStatusRequest) {
    return updateAppStatus(data);
  }
}

/** Build the generated multipart body from the feature's native image value. */
function toDivisionBody(data: UpsertDivisionRequest, image?: ImageUpload) {
  return {
    data: JSON.stringify(data),
    image: image as unknown as Blob | undefined,
  };
}
