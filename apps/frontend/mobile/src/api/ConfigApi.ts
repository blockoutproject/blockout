import {CONFIG} from "@/src/config/config";
import {Division} from "../types/Division";
import {RawDivisionMapping} from "../types/RawDivisionMapping";
import {ScraperStatus} from "../types/ScraperStatus";
import {LegalDocument} from "../types/LegalDocument";
import {AppStatusDTO, AppStatusUpdateDTO} from "../types/AppStatus";
import {CustomImage} from "../types/Common";
import {appendJson} from "../utils/utils";
import {BaseApi} from "./core/BaseApi";

export class ConfigApi extends BaseApi {
  constructor() {
    super({baseURL: CONFIG.API_GATEWAY_BASE_URL});
  }

  public getLegalDocument(type: string) {
    return this.httpPublic.get<LegalDocument>(
      `/config/legal/${type}`,
    );
  }

  public updateLegalDocument(type: string, data: Partial<LegalDocument>) {
    return this.httpAuth.put<Partial<LegalDocument>>(`/config/legal/${type}`, data);
  }

  public getDivisions() {
    return this.httpPublic.get<Division[]>("/config/divisions");
  }

  public createDivision(
    data: Partial<Division>,
    image?: CustomImage,
  ) {
    const formData = new FormData();
    appendJson(formData, "data", data);
    if (image) {
      formData.append("image", {
        uri: image.uri,
        type: image.type,
        name: image.name,
      } as any);
    }
    return this.httpAuth.post<Division>("/config/divisions", formData, {
      headers: {"Content-Type": "multipart/form-data"},
    });
  }

  public updateDivision(
    id: number,
    data: Partial<Division>,
    image?: CustomImage,
  ) {
    const formData = new FormData();
    appendJson(formData, "data", data);
    if (image) {
      formData.append("image", {
        uri: image.uri,
        type: image.type,
        name: image.name,
      } as any);
    }
    return this.httpAuth.put<Division>(`/config/divisions/${id}`, formData, {
      headers: {"Content-Type": "multipart/form-data"},
    });
  }

  public deactivateDivision(id: number) {
    return this.httpAuth.delete<void>(`/config/divisions/${id}`);
  }

  public getRawDivisionMappings(leagueCode?: string, season?: string) {
    return this.httpAuth.get<RawDivisionMapping[]>("/config/raw-divisions", {
      params: {leagueCode, season},
    });
  }

  public getRawDivisionMappingById(id: number) {
    return this.httpAuth.get<RawDivisionMapping>(`/config/raw-divisions/${id}`);
  }

  public createRawDivisionMapping(data: Partial<RawDivisionMapping>) {
    return this.httpAuth.post<RawDivisionMapping>("/config/raw-divisions", data);
  }

  public updateRawDivisionMapping(id: number, data: Partial<RawDivisionMapping>) {
    return this.httpAuth.put<RawDivisionMapping>(`/config/raw-divisions/${id}`, data);
  }

  public updateScraperStatus(name: string, enabled: boolean) {
    return this.httpAuth.put<ScraperStatus>(
      `/config/scrapers/${name}/enabled`,
      null,
      {params: {enabled}},
    );
  }

  public getScraperStatuses() {
    return this.httpAuth.get<ScraperStatus[]>("/config/scrapers/status");
  }

  public getAppStatus() {
    return this.httpPublic.get<AppStatusDTO>("/config/app-status");
  }

  public updateAppStatus(data: AppStatusUpdateDTO) {
    return this.httpAuth.put<AppStatusDTO>("/config/app-status", data);
  }
}
