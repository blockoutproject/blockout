import {useQuery} from "@tanstack/react-query";
import {useApis} from "@/src/shared/providers/ApiProvider";
import {MatchLiveSummaryResponse, LiveLinkStatusEnum} from "@/src/shared/generated/models";

export const useLiveModerationMatches = (status?: LiveLinkStatusEnum | null) => {
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
