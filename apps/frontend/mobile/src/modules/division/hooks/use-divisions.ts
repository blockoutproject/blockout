import { useQuery } from "@tanstack/react-query";
import { DivisionResponse } from "@/src/shared/generated/models";
import { useApis } from "@/src/shared/providers/api-provider";

export const useDivisions = () => {
  const { mobile } = useApis();

  return useQuery<DivisionResponse[]>({
    queryKey: ["divisions"],
    queryFn: () => mobile.config.getDivisions(),
    staleTime: 1000 * 60,
  });
};
