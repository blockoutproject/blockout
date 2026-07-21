import {useQuery} from "@tanstack/react-query";
import {useApis} from "@/src/shared/providers/ApiProvider";
import {EnrichedMatchLiveSummaryDTO, LiveLinkStatus} from "@/src/types/Match";

export const useLiveModerationMatches = (status?: LiveLinkStatus | null) => {
  const {mobile} = useApis();

  return useQuery<EnrichedMatchLiveSummaryDTO[]>({
    queryKey: ["live-moderation-matches", status ?? "ALL"],
    queryFn: async () => {
      return await mobile.matches.getMatchesForLiveModeration(
        status ?? undefined,
      );
    },
    staleTime: 0,
  });
};
