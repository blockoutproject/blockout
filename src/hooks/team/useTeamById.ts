import { Team } from "@/src/types/Team";
import TeamsApi from "@/src/api/TeamsApi";
import { useEntityById } from "../utils/useEntityById";

export const useTeamById = (id?: number) =>
    useEntityById<Team>("teams", (teamId) => TeamsApi.getInstance().getTeamById(teamId), id);