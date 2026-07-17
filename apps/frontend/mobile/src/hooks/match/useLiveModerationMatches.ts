import { useQuery } from '@tanstack/react-query';
import { EnrichedMatchLiveSummaryDTO, LiveLinkStatus } from '@/src/types/Match';
import { listMobileMatchesForLiveModeration } from '@/src/api/generated/mobile-gateway/endpoints/mobile-match-moderation/mobile-match-moderation';
import {
  ListMobileMatchesForLiveModerationQueryParams,
  ListMobileMatchesForLiveModerationResponse,
} from '@/src/api/generated/mobile-gateway/schemas/mobile-match-moderation/mobile-match-moderation.zod';
import { toMatchModerationView } from './matchView';

export const useLiveModerationMatches = (status?: LiveLinkStatus | null) => {
  return useQuery<EnrichedMatchLiveSummaryDTO[]>({
    queryKey: ['live-moderation-matches', status ?? 'ALL'],
    queryFn: async ({ signal }) => {
      const items: EnrichedMatchLiveSummaryDTO[] = [];
      let page = 0;

      while (true) {
        const params = ListMobileMatchesForLiveModerationQueryParams.parse({
          status: status ?? undefined,
          page,
          pageSize: 100,
        });
        const response = ListMobileMatchesForLiveModerationResponse.parse(
          await listMobileMatchesForLiveModeration(params, undefined, signal),
        );
        items.push(...response.items.map(toMatchModerationView));

        if (!response.pageInfo.hasNext) return items;
        page = response.pageInfo.page + 1;
      }
    },
    staleTime: 0,
  });
};
