import {useQuery} from "@tanstack/react-query";
import type {CustomUser} from "@/src/types/User";
import {useApis} from "@/src/context/ApiProvider";
import {ApiError} from "@/src/api/core/ApiError";

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
