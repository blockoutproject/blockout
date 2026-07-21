import {useQuery} from "@tanstack/react-query";
import {useApis} from "@/src/shared/providers/ApiProvider";
import {AppStatusResponse} from "@/src/modules/app-status/model/AppStatus";

export const useAppStatus = () => {
  const {mobile} = useApis();

  return useQuery<AppStatusResponse>({
    queryKey: ["appStatus"],
    queryFn: () => mobile.config.getAppStatus(),
    staleTime: 0,
  });
};
