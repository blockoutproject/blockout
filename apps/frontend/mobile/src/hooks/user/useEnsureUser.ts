import {useQuery} from "@tanstack/react-query";
import type {CustomUser} from "@/src/types/User";
import {useApis} from "@/src/shared/providers/ApiProvider";
import {ApiError} from "@/src/shared/api/ApiError";

export const useEnsureUser = () => {
  const {mobile} = useApis();

  return useQuery<CustomUser, ApiError>({
    queryKey: ["current-user"],
    enabled: false,
    staleTime: 5 * 60 * 1000,
    retry: false,
    queryFn: async () => mobile.users.ensureCurrentUser(),
  });
};
