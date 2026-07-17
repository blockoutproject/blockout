import { useQuery } from '@tanstack/react-query';
import {
  getGetMobileAppStatusQueryKey,
  getMobileAppStatus,
} from '@/src/api/generated/mobile-gateway/endpoints/mobile-configuration/mobile-configuration';
import { GetMobileAppStatusResponse } from '@/src/api/generated/mobile-gateway/schemas/mobile-configuration/mobile-configuration.zod';
import type { AppStatusDTO } from '@/src/types/AppStatus';
import { toAppStatusView } from './appStatusView';

/** Returns the validated app-status view with the existing refresh policy. */
export const useAppStatus = () => {
  return useQuery<AppStatusDTO>({
    queryKey: getGetMobileAppStatusQueryKey(),
    queryFn: async ({ signal }) => {
      const response = await getMobileAppStatus(undefined, signal);
      return toAppStatusView(GetMobileAppStatusResponse.parse(response));
    },
    staleTime: 0,
  });
};
