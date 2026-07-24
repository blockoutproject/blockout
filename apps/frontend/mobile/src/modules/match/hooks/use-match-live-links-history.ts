import { useQuery } from "@tanstack/react-query";
import { useApis } from "@/src/shared/providers/api-provider";
import { MatchLiveLinkHistoryResponse } from "@/src/shared/generated/models";

export const useMatchLiveLinksHistory = (matchId: number) => {
  const { mobile } = useApis();

  return useQuery<MatchLiveLinkHistoryResponse[]>({
    queryKey: ["match-live-links-history", matchId],
    queryFn: async () => {
      return await mobile.matches.getMatchLiveLinksHistory(matchId);
    },
    enabled: !!matchId,
    staleTime: 0,
  });
};
