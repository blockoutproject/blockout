import UsersApi from "@/src/api/UsersApi";
import { CustomUser } from "@/src/types/User";
import { useQuery } from "@tanstack/react-query";

export const useCustomUser = (auth0UserSub?: string) => {
    return useQuery<CustomUser | null>({
        queryKey: ['custom-user', auth0UserSub],
        queryFn: async () => {
            if (!auth0UserSub) return null;
            const usersApi = UsersApi.getInstance();
            return await usersApi.getUserByAuth0Id(auth0UserSub);
        },
        enabled: !!auth0UserSub,
        staleTime: 1000 * 60 * 5,
    });
}