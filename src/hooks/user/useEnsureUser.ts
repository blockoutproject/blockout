import { useQuery } from "@tanstack/react-query";
import UsersApi from "@/src/api/UsersApi";
import type { CustomUser } from "@/src/types/User";

export const useEnsureUser = ({ enabled = true }: { enabled?: boolean } = {}) => {
    return useQuery<CustomUser>({
        queryKey: ["current-user"],
        enabled,
        queryFn: async () => {
            return await UsersApi.getInstance().ensureCurrentUser();
        },
    });
};