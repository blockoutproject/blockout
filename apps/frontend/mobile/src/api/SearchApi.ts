import {CONFIG} from "@/src/shared/config/config";
import {ClubSearchDocDTO} from "../types/Club";
import {PoolSearchDocDTO} from "../types/Pool";
import {TeamSearchDocDTO} from "../types/Team";
import {BaseApi} from "@/src/shared/api/BaseApi";
import {EnumFormat} from "../types/enums/Format";
import {EnumGender} from "../types/enums/Gender";

export class SearchApi extends BaseApi {
  constructor() {
    super({baseURL: CONFIG.API_GATEWAY_BASE_URL});
  }

  public searchClubs(query: string) {
    return this.httpPublic.get<ClubSearchDocDTO[]>("/search/clubs", {
      params: {query},
    });
  }

  public searchTeams(
    query: string,
    season?: string,
    divisionId?: number,
    format?: EnumFormat,
    gender?: EnumGender,
  ) {
    return this.httpPublic.get<TeamSearchDocDTO[]>("/search/teams", {
      params: {
        query,
        ...(season ? {season} : {}),
        ...(typeof divisionId === "number" ? {divisionId} : {}),
        ...(format ? {format} : {}),
        ...(gender ? {gender} : {}),
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
    return this.httpPublic.get<PoolSearchDocDTO[]>("/search/pools", {
      params: {
        query,
        ...(season ? {season} : {}),
        ...(typeof divisionId === "number" ? {divisionId} : {}),
        ...(format ? {format} : {}),
        ...(gender ? {gender} : {}),
      },
    });
  }
}
