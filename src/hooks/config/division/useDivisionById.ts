import { useEntityById } from "../../utils/useEntityById";
import { Division } from "@/src/types/Division";
import ConfigApi from "@/src/api/ConfigApi";

export const useDivisionById = (id?: number) =>
    useEntityById<Division>("divisions", (divisionId) => ConfigApi.getInstance().getDivisionById(divisionId), id);