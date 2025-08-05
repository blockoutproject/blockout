import UsersApi from '@/src/api/UsersApi';
import { CustomUser } from '@/src/types/User';
import { useQuery } from '@tanstack/react-query';

export const useEnsureUser = ({ enabled = true }: { enabled?: boolean } = {}) => {
    return useQuery<CustomUser | null>({
        queryKey: ['current-user'],
        enabled,
        queryFn: async () => UsersApi.getInstance().ensureCurrentUser(),
        staleTime: 5 * 60 * 1000,
    });
};