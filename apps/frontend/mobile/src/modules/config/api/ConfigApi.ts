import {CONFIG} from "@/src/shared/config/config";
import {DivisionResponse, UpsertDivisionRequest} from "@/src/modules/division/model/Division";
import {
  RawDivisionMappingResponse,
  UpdateRawDivisionMappingRequest,
} from "@/src/modules/raw-division-mapping/model/RawDivisionMapping";
import {ScraperStatusResponse} from "@/src/modules/administration/model/ScraperStatus";
import {
  LegalDocumentResponse,
  UpdateLegalDocumentRequest,
} from "@/src/modules/legal/model/LegalDocument";
import {AppStatusResponse, UpdateAppStatusRequest} from "@/src/modules/app-status/model/AppStatus";
import {ImageUpload} from "@/src/shared/model/ImageUpload";
import {appendJson} from "@/src/shared/lib/utils";
import {BaseApi} from "@/src/shared/api/BaseApi";

export class ConfigApi extends BaseApi {
  constructor() {
    super({baseURL: CONFIG.API_GATEWAY_BASE_URL});
  }

  public getLegalDocument(type: string) {
    return this.httpPublic.get<LegalDocumentResponse>(
      `/config/legal/${type}`,
    );
  }

  public updateLegalDocument(type: string, data: UpdateLegalDocumentRequest) {
    return this.httpAuth.put<LegalDocumentResponse>(`/config/legal/${type}`, data);
  }

  public getDivisions() {
    return this.httpPublic.get<DivisionResponse[]>("/config/divisions");
  }

  public createDivision(
    data: UpsertDivisionRequest,
    image?: ImageUpload,
  ) {
    const formData = new FormData();
    appendJson(formData, "data", data);
    if (image) {
      formData.append("image", {
        uri: image.uri,
        type: image.type,
        name: image.name,
      } as unknown as Blob);
    }
    return this.httpAuth.post<DivisionResponse>("/config/divisions", formData, {
      headers: {"Content-Type": "multipart/form-data"},
    });
  }

  public updateDivision(
    id: number,
    data: UpsertDivisionRequest,
    image?: ImageUpload,
  ) {
    const formData = new FormData();
    appendJson(formData, "data", data);
    if (image) {
      formData.append("image", {
        uri: image.uri,
        type: image.type,
        name: image.name,
      } as unknown as Blob);
    }
    return this.httpAuth.put<DivisionResponse>(`/config/divisions/${id}`, formData, {
      headers: {"Content-Type": "multipart/form-data"},
    });
  }

  public deactivateDivision(id: number) {
    return this.httpAuth.delete<void>(`/config/divisions/${id}`);
  }

  public getRawDivisionMappings(leagueCode?: string, season?: string) {
    return this.httpAuth.get<RawDivisionMappingResponse[]>("/config/raw-divisions", {
      params: {leagueCode, season},
    });
  }

  public updateRawDivisionMapping(id: number, data: UpdateRawDivisionMappingRequest) {
    return this.httpAuth.put<RawDivisionMappingResponse>(`/config/raw-divisions/${id}`, data);
  }

  public updateScraperStatus(name: string, enabled: boolean) {
    return this.httpAuth.put<ScraperStatusResponse>(
      `/config/scrapers/${name}/enabled`,
      null,
      {params: {enabled}},
    );
  }

  public getScraperStatuses() {
    return this.httpAuth.get<ScraperStatusResponse[]>("/config/scrapers/status");
  }

  public getAppStatus() {
    return this.httpPublic.get<AppStatusResponse>("/config/app-status");
  }

  public updateAppStatus(data: UpdateAppStatusRequest) {
    return this.httpAuth.put<AppStatusResponse>("/config/app-status", data);
  }
}
