import {useApis} from "@/src/shared/providers/ApiProvider";
import {useEntityById} from "@/src/shared/hooks/useEntityById";
import {MatchResponse} from "@/src/shared/generated/models";

export const useMatchById = (id?: number) => {
  const {mobile} = useApis();

  return useEntityById<MatchResponse, number>(
    "matches",
    (matchId: number) => mobile.matches.getMatchById(matchId),
    id
  );
};
