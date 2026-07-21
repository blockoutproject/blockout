import { CONFIG } from "@/src/shared/config/config";
import { ClubSearchDocDTO } from "../types/Club";
import type { PoolSearchResponse } from "@/src/modules/pool/model/Pool";
import type { TeamSearchResponse } from "@/src/modules/team/model/Team";
import { BaseApi } from "@/src/shared/api/BaseApi";
import { EnumFormat } from "../types/enums/Format";
import { EnumGender } from "../types/enums/Gender";

export class SearchApi extends BaseApi {
  constructor() {
    super({ baseURL: CONFIG.API_GATEWAY_BASE_URL });
  }

  public searchClubs(query: string) {
    return this.httpPublic.get<ClubSearchDocDTO[]>("/search/clubs", {
      params: { query },
    });
  }

  public searchTeams(
    query: string,
    season?: string,
    divisionId?: number,
    format?: EnumFormat,
    gender?: EnumGender,
  ) {
    return this.httpPublic.get<TeamSearchResponse[]>("/search/teams", {
      params: {
        query,
        ...(season ? { season } : {}),
        ...(typeof divisionId === "number" ? { divisionId } : {}),
        ...(format ? { format } : {}),
        ...(gender ? { gender } : {}),
      },
    });
  }

  public searchPools(
    query: string,
    season?: string,
    divisionId?: number,
    format?: EnumFormat,
    gender?: EnumGender,
  ) {
    return this.httpPublic.get<PoolSearchResponse[]>("/search/pools", {
      params: {
        query,
        ...(season ? { season } : {}),
        ...(typeof divisionId === "number" ? { divisionId } : {}),
        ...(format ? { format } : {}),
        ...(gender ? { gender } : {}),
      },
    });
  }
}
