import { useQuery } from '@tanstack/react-query';
import {
  getListMobileDivisionsQueryKey,
  listMobileDivisions,
} from '@/src/api/generated/mobile-gateway/endpoints/mobile-configuration/mobile-configuration';
import { ListMobileDivisionsResponse } from '@/src/api/generated/mobile-gateway/schemas/mobile-configuration/mobile-configuration.zod';
import type { Division } from '@/src/types/Division';
import { toDivisionView } from './divisionView';

/** Returns validated divisions with the existing one-minute freshness. */
export const useDivisions = () => {
  return useQuery<Division[]>({
    queryKey: getListMobileDivisionsQueryKey(),
    queryFn: async ({ signal }) => {
      const response = await listMobileDivisions(undefined, signal);
      return ListMobileDivisionsResponse.parse(response).items.map(
        toDivisionView,
      );
    },
    staleTime: 1000 * 60,
  });
};
