import UsersApi from '@/src/api/UsersApi';
import { CustomUser } from '@/src/types/User';
import { useQuery } from '@tanstack/react-query';

export const useCurrentUser = ({ enabled = true }: { enabled?: boolean } = {}) => {
    return useQuery<CustomUser | null>({
        queryKey: ['current-user'],
        enabled,
        queryFn: async () => UsersApi.getInstance().getCurrentUser(),
        staleTime: 5 * 60 * 1000,
    });
};