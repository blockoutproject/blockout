import {useQuery} from "@tanstack/react-query";
import {DivisionResponse} from "@/src/modules/division/model/Division";
import {useApis} from "@/src/shared/providers/ApiProvider";

export const useDivisions = () => {
  const {mobile} = useApis();

  return useQuery<DivisionResponse[]>({
    queryKey: ["divisions"],
    queryFn: () => mobile.config.getDivisions(),
    staleTime: 1000 * 60,
  });
};
