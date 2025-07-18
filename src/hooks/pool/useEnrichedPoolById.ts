import { EnrichedPoolDTO } from "@/src/types/Pool";
import { useEntityById } from "../utils/useEntityById";
import MobileGatewayApi from "@/src/api/MobileGatewayApi";

export const useEnrichedPoolById = (id?: number) =>
    useEntityById<EnrichedPoolDTO>("enrichedPools", (poolId) => MobileGatewayApi.getInstance().getEnrichedPoolById(Number(poolId)), id);