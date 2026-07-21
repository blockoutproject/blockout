import {useQuery} from "@tanstack/react-query";
import {useApis} from "@/src/shared/providers/ApiProvider";
import {MatchLiveLinkInternalResponse} from "@/src/modules/match/model/Match";

export const useMatchLiveLinksHistory = (matchId: number) => {
  const {mobile} = useApis();

  return useQuery<MatchLiveLinkInternalResponse[]>({
    queryKey: ["match-live-links-history", matchId],
    queryFn: async () => {
      return await mobile.matches.getMatchLiveLinksHistory(matchId);
    },
    enabled: !!matchId,
    staleTime: 0
  });
};
