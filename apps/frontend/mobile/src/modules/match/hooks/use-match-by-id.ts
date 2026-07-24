import { useApis } from "@/src/shared/providers/api-provider";
import { useEntityById } from "@/src/shared/hooks/use-entity-by-id";
import { MatchResponse } from "@/src/shared/generated/models";

export const useMatchById = (id?: number) => {
  const { mobile } = useApis();

  return useEntityById<MatchResponse, number>(
    "matches",
    (matchId: number) => mobile.matches.getMatchById(matchId),
    id,
  );
};
