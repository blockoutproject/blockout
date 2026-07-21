import {useQuery} from '@tanstack/react-query';
import {useApis} from '@/src/shared/providers/ApiProvider';
import {AppStatusDTO} from '@/src/types/AppStatus';

export const useAppStatus = () => {
  const {mobile} = useApis();

  return useQuery<AppStatusDTO>({
    queryKey: ['appStatus'],
    queryFn: async () => {
      return await mobile.config.getAppStatus();
    },
    staleTime: 0,
  });
};
