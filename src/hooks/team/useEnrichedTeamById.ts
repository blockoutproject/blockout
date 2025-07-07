import { EnrichedPoolDTO } from "@/src/types/Pool";
import { useEntityById } from "../utils/useEntityById";
import MobileGatewayApi from "@/src/api/MobileGatewayApi";
import { EnrichedTeamDTO } from "@/src/types/Team";

export const useEnrichedTeamById = (id?: number) =>
    useEntityById<EnrichedTeamDTO>("enrichedTeams", (teamId) => MobileGatewayApi.getInstance().getEnrichedTeamById(teamId), id);