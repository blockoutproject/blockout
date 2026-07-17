import { getMobilePool } from '@/src/api/generated/mobile-gateway/endpoints/mobile-pools/mobile-pools';
import {
  GetMobilePoolParams,
  GetMobilePoolResponse,
} from '@/src/api/generated/mobile-gateway/schemas/mobile-pools/mobile-pools.zod';
import { useEntityById } from '../utils/useEntityById';
import { EnrichedPoolDTO } from '@/src/types/Pool';
import { toEnrichedPoolView } from './poolView';

export const useEnrichedPoolById = (id?: number, enabled?: boolean) => {
  return useEntityById<EnrichedPoolDTO>(
    'enrichedPools',
    async (poolId: number, signal?: AbortSignal) => {
      const path = GetMobilePoolParams.parse({ id: poolId });
      const response = await getMobilePool(path.id, undefined, signal);
      return toEnrichedPoolView(GetMobilePoolResponse.parse(response));
    },
    id,
    enabled,
  );
};
