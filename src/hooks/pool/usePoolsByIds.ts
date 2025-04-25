import PoolsApi from '@/src/api/PoolsApi';
import type { Pool } from '@/src/types/Pool';
import { useEntitiesByIds } from '../utils/useEntitiesByIds';

export const usePoolsByIds = (ids?: number[]) =>
    useEntitiesByIds<Pool>('pools', (ids) => PoolsApi.getInstance().getPoolsByIds(ids), ids);
