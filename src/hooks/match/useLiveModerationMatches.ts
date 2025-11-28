import { useQuery } from "@tanstack/react-query";
import { useApis } from "@/src/context/ApiProvider";
import { EnrichedMatchLiveSummaryDTO } from "@/src/types/Match";

export const useLiveModerationMatches = () => {
    const { mobile } = useApis();

    return useQuery<EnrichedMatchLiveSummaryDTO[]>({
        queryKey: ["live-moderation-matches"],
        queryFn: async () => {
            return await mobile.matches.getMatchesForLiveModeration();
        },
        staleTime: 0
    });
};