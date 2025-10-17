import { useEntityById } from "../utils/useEntityById";
import MobileGatewayApi from "@/src/api/MobileGatewayApi";
import { TeamSummaryDTO } from "@/src/types/Team";

export const useTeamListByCLubId = (id?: string, enabled?: boolean) =>
    useEntityById<TeamSummaryDTO[]>("teamList", (clubId) => MobileGatewayApi.getInstance().getTeamListByClubId(clubId), id, enabled);