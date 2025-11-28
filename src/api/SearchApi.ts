import { CONFIG } from "@/src/config/config";
import { ClubSearchDocDTO } from "../types/Club";
import { PoolSearchDocDTO } from "../types/Pool";
import { TeamSearchDocDTO } from "../types/Team";
import { BaseApi } from "./core/BaseApi";

export class SearchApi extends BaseApi {
    constructor() {
        super({ baseURL: CONFIG.API_GATEWAY_BASE_URL });
    }

    public searchClubs(query: string) {
        return this.httpPublic.get<ClubSearchDocDTO[]>("/search/clubs", {
            params: { query },
        });
    }

    public searchPools(query: string, season?: string) {
        return this.httpPublic.get<PoolSearchDocDTO[]>("/search/pools", {
            params: {
                query,
                ...(season ? { season } : {}),
            },
        });
    }

    public searchTeams(query: string, season?: string) {
        return this.httpPublic.get<TeamSearchDocDTO[]>("/search/teams", {
            params: {
                query,
                ...(season ? { season } : {}),
            },
        });
    }
}