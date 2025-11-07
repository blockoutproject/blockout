import { useApis } from "@/src/context/ApiProvider";
import { useEntityById } from "../utils/useEntityById";
import { EnrichedPoolDTO } from "@/src/types/Pool";

export const useEnrichedPoolById = (id?: number, enabled?: boolean) => {
    const { mobile } = useApis();

    return useEntityById<EnrichedPoolDTO>(
        "enrichedPools",
        (poolId: number) => mobile.getEnrichedPoolById(poolId),
        id,
        enabled
    );
};