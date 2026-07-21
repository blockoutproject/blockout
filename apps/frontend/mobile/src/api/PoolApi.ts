import {CONFIG} from "@/src/shared/config/config";
import {EnrichedPoolDTO, Pool, PoolSummaryDTO} from "@/src/types/Pool";
import {BaseApi} from "@/src/shared/api/BaseApi";

export class PoolApi extends BaseApi {
  constructor() {
    super({baseURL: CONFIG.API_GATEWAY_BASE_URL});
  }

  public getEnrichedPoolById(id: number) {
    return this.httpPublic.get<EnrichedPoolDTO>(`/pools/${id}`);
  }

  public getPoolListByIds(ids: number[]) {
    return this.httpPublic.get<PoolSummaryDTO[]>("/pools/by-ids", {params: {ids}});
  }

  public updatePool(id: number, data: Partial<Pool>) {
    return this.httpAuth.put<Pool>(`/pools/${id}`, data);
  }
}
