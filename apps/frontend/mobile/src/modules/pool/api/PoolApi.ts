import {
  getPoolById,
  getPoolsByIds,
} from "@/src/shared/generated/endpoints/pool-public";
import {updatePool} from "@/src/shared/generated/endpoints/pool-secure";
import type {UpdatePoolRequest} from "@/src/shared/generated/models";

/** Expose pool operations through the feature API boundary. */
export class PoolApi {
  /** Load one public pool projection. */
  public getPoolById(id: number) {
    return getPoolById(id);
  }

  /** Load the public summaries for the requested pools. */
  public getPoolsByIds(ids: number[]) {
    return getPoolsByIds({ids});
  }

  /** Update one pool. */
  public updatePool(id: number, data: UpdatePoolRequest) {
    return updatePool(id, data);
  }
}
