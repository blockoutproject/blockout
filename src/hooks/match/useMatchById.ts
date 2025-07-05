import { useEntityById } from "../utils/useEntityById";
import { EnrichedMatchDTO } from "@/src/types/Match";
import MobileGatewayApi from "@/src/api/MobileGatewayApi";

export const useEnrichedMatchById = (id?: number) =>
    useEntityById<EnrichedMatchDTO>("enrichedMatches", (matchId) => MobileGatewayApi.getInstance().getEnrichedMatchById(matchId), id);