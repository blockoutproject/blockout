import { useApis } from "@/src/context/ApiProvider";
import { useEntityById } from "../../utils/useEntityById";
import { Division } from "@/src/types/Division";

export const useDivisionById = (id?: number) => {
    const { config } = useApis();

    return useEntityById<Division>(
        "divisions",
        (divisionId: number) => config.getDivisionById(divisionId),
        id
    );
};