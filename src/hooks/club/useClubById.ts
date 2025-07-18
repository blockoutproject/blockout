import { useEntityById } from "../utils/useEntityById";
import { Club } from "@/src/types/Club";
import ClubsApi from "@/src/api/ClubsApi";

export const useClubById = (id?: string) =>
    useEntityById<Club>("clubs", (clubId) => ClubsApi.getInstance().getClubById(clubId.toString()), id);