import { useQuery } from "@tanstack/react-query";
import { useApis } from "@/src/context/ApiProvider";
import { MatchLiveLinkDTO } from "@/src/types/Match";

export const useMatchLiveLinksHistory = (matchId: number) => {
    const { mobile } = useApis();

    return useQuery<MatchLiveLinkDTO[]>({
        queryKey: ["match-live-links-history", matchId],
        queryFn: async () => {
            return await mobile.matches.getMatchLiveLinksHistory(matchId);
        },
        enabled: !!matchId,
        staleTime: 0
    });
};