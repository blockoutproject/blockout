import { useQuery } from '@tanstack/react-query';
import { MatchLiveLinkDTO } from '@/src/types/Match';
import { listMobileMatchLiveLinkHistory } from '@/src/api/generated/mobile-gateway/endpoints/mobile-match-moderation/mobile-match-moderation';
import {
  ListMobileMatchLiveLinkHistoryParams,
  ListMobileMatchLiveLinkHistoryQueryParams,
  ListMobileMatchLiveLinkHistoryResponse,
} from '@/src/api/generated/mobile-gateway/schemas/mobile-match-moderation/mobile-match-moderation.zod';
import { toMatchLiveLinkView } from './matchView';

export const useMatchLiveLinksHistory = (matchId: number) => {
  return useQuery<MatchLiveLinkDTO[]>({
    queryKey: ['match-live-links-history', matchId],
    queryFn: async ({ signal }) => {
      const path = ListMobileMatchLiveLinkHistoryParams.parse({ matchId });
      const items: MatchLiveLinkDTO[] = [];
      let page = 0;

      while (true) {
        const params = ListMobileMatchLiveLinkHistoryQueryParams.parse({
          page,
          pageSize: 100,
        });
        const response = ListMobileMatchLiveLinkHistoryResponse.parse(
          await listMobileMatchLiveLinkHistory(
            path.matchId,
            params,
            undefined,
            signal,
          ),
        );
        items.push(...response.items.map(toMatchLiveLinkView));

        if (!response.pageInfo.hasNext) return items;
        page = response.pageInfo.page + 1;
      }
    },
    enabled: !!matchId,
    staleTime: 0,
  });
};
