import { useQuery } from "@tanstack/react-query";
import UsersApi from "@/src/api/UsersApi";
import type { CustomUser } from "@/src/types/User";
import { ApiError } from "@/src/api/AbstractApi";

export const useEnsureUser = ({ enabled = true }: { enabled?: boolean } = {}) => {
    return useQuery<CustomUser | null, ApiError, CustomUser | null>({
        queryKey: ["current-user"],
        enabled,
        queryFn: async () => {
            const user = await UsersApi.getInstance().ensureCurrentUser();
            return user;
        },
        retry: (count, err) => {
            if (err?.status === 401) return false;
            if (err?.status === 500) return count < 1;
            return count < 2;
        },
        staleTime: 5 * 60 * 1000,
    });
};