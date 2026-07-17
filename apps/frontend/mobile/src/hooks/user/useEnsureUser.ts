import { useQuery } from '@tanstack/react-query';
import type { CustomUser } from '@/src/types/User';
import { ApiError } from '@/src/api/core/ApiError';
import { ensureCurrentMobileUser } from '@/src/api/generated/mobile-gateway/endpoints/mobile-users/mobile-users';
import { EnsureCurrentMobileUserResponse } from '@/src/api/generated/mobile-gateway/schemas/mobile-users/mobile-users.zod';
import { toCustomUser } from './userView';

export const useEnsureUser = () => {
  return useQuery<CustomUser, ApiError>({
    queryKey: ['current-user'],
    enabled: false,
    staleTime: 5 * 60 * 1000,
    retry: false,
    queryFn: async ({ signal }) =>
      toCustomUser(
        EnsureCurrentMobileUserResponse.parse(
          await ensureCurrentMobileUser(undefined, signal),
        ),
      ),
  });
};
