import { useApis } from "@/src/context/ApiProvider";
import { useEntityById } from "../utils/useEntityById";
import { EnrichedMatchDTO } from "@/src/types/Match";

export const useEnrichedMatchById = (id?: number) => {
    const { mobile } = useApis();

    return useEntityById<EnrichedMatchDTO>(
        "enrichedMatches",
        (matchId: number) => mobile.getEnrichedMatchById(matchId),
        id
    );
};