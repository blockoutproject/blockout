import { Pool } from "@/src/types/Pool";
import PoolsApi from "@/src/api/PoolsApi";
import { useEntityById } from "../utils/useEntityById";

export const usePoolById = (id?: number) =>
    useEntityById<Pool>("pools", (poolId) => PoolsApi.getInstance().getPoolById(poolId), id);