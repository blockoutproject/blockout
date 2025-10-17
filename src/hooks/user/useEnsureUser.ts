import { useQuery } from "@tanstack/react-query";
import UsersApi from "@/src/api/UsersApi";
import type { CustomUser } from "@/src/types/User";
import { useAuth0 } from "react-native-auth0";

export const useEnsureUser = () => {
    const { user, getCredentials } = useAuth0();

    return useQuery<CustomUser>({
        queryKey: ["current-user", user?.sub ?? "anon"],
        enabled: !!user,
        staleTime: 5 * 60 * 1000,
        retry: false,
        queryFn: async () => {
            const tokenSupplier = async () => {
                const creds = await getCredentials(undefined, 60);
                return creds?.accessToken ?? null;
            };
            return await UsersApi.ensureCurrentUserWithTokenSupplier(tokenSupplier);
        },
    });
};