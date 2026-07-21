import { useQuery } from "@tanstack/react-query";
import type { UserResponse } from "@/src/modules/user/model/User";
import { useApis } from "@/src/shared/providers/ApiProvider";
import { ApiError } from "@/src/shared/api/ApiError";

export const CURRENT_USER_QUERY_KEY = ["current-user"] as const;

export const useEnsureUser = () => {
  const { mobile } = useApis();

  return useQuery<UserResponse, ApiError>({
    queryKey: CURRENT_USER_QUERY_KEY,
    enabled: false,
    staleTime: 5 * 60 * 1000,
    retry: false,
    queryFn: async () => mobile.users.ensureCurrentUser(),
  });
};
