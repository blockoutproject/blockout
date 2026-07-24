import { useQuery } from "@tanstack/react-query";
import { useApis } from "@/src/shared/providers/api-provider";
import { AppStatusResponse } from "@/src/shared/generated/models";

export const useAppStatus = () => {
  const { mobile } = useApis();

  return useQuery<AppStatusResponse>({
    queryKey: ["appStatus"],
    queryFn: () => mobile.config.getAppStatus(),
    staleTime: 0,
  });
};
