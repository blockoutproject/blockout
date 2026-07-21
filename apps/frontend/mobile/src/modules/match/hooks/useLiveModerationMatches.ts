import {useQuery} from "@tanstack/react-query";
import {useApis} from "@/src/shared/providers/ApiProvider";
import {MatchLiveSummaryResponse, LiveLinkStatus} from "@/src/modules/match/model/Match";

export const useLiveModerationMatches = (status?: LiveLinkStatus | null) => {
  const {mobile} = useApis();

  return useQuery<MatchLiveSummaryResponse[]>({
    queryKey: ["live-moderation-matches", status ?? "ALL"],
    queryFn: async () => {
      return await mobile.matches.getMatchesForLiveModeration(
        status ?? undefined,
      );
    },
    staleTime: 0,
  });
};
