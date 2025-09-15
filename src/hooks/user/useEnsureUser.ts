import { useQuery } from "@tanstack/react-query";
import UsersApi from "@/src/api/UsersApi";
import type { CustomUser } from "@/src/types/User";
import { useAuth0 } from "react-native-auth0";

export const useEnsureUser = () => {
    const { user } = useAuth0();

    return useQuery<CustomUser>({
        queryKey: ["current-user"],
        enabled: !!user,
        staleTime: 5 * 60 * 1000,
        queryFn: async () => {
            console.log("Ensuring current user...");
            return await UsersApi.getInstance().ensureCurrentUser();
        },
        retry: false
    });
};