import { useQuery } from "@tanstack/react-query";
import UsersApi from "@/src/api/UsersApi";
import type { CustomUser } from "@/src/types/User";
import { useAuth0 } from "react-native-auth0";

export const useEnsureUser = () => {
    const { user, getCredentials } = useAuth0();

    return useQuery<CustomUser>({
        queryKey: ["current-user"],
        enabled: !!user, // on ne déclenche que si Auth0 a un user
        staleTime: 5 * 60 * 1000,
        retry: false,
        queryFn: async () => {
            // Token supplier basé sur CredentialsManager (renouvelle si expiré)
            const tokenSupplier = async () => {
                const creds = await getCredentials(undefined, 60);
                return creds?.accessToken ?? null;
            };
            return await UsersApi.ensureCurrentUserWithTokenSupplier(tokenSupplier);
        },
    });
};