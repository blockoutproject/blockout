import type {
  PoolInternalResponse,
  PoolResponse,
  PoolSummaryResponse,
  UpdatePoolRequest,
} from "@/src/modules/pool/model/Pool";
import { BaseApi } from "@/src/shared/api/BaseApi";
import { CONFIG } from "@/src/shared/config/config";

export class PoolApi extends BaseApi {
  constructor() {
    super({ baseURL: CONFIG.API_GATEWAY_BASE_URL });
  }

  public getPoolById(id: number) {
    return this.httpPublic.get<PoolResponse>(`/pools/${id}`);
  }

  public getPoolsByIds(ids: number[]) {
    return this.httpPublic.get<PoolSummaryResponse[]>("/pools/by-ids", {
      params: { ids },
    });
  }

  public updatePool(id: number, data: UpdatePoolRequest) {
    return this.httpAuth.put<PoolInternalResponse>(`/pools/${id}`, data);
  }
}
