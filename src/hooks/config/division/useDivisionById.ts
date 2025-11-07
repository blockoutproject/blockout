import { useApis } from "@/src/context/ApiProvider";
import { useEntityById } from "../../utils/useEntityById";
import { Division } from "@/src/types/Division";

export const useDivisionById = (id?: number) => {
    const { mobile } = useApis();

    return useEntityById<Division>(
        "divisions",
        (divisionId: number) => mobile.getDivisionById(divisionId),
        id
    );
};