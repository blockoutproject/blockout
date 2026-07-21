import {useApis} from "@/src/shared/providers/ApiProvider";
import {useEntityById} from "@/src/shared/hooks/useEntityById";
import {MatchResponse} from "@/src/modules/match/model/Match";

export const useMatchById = (id?: number) => {
  const {mobile} = useApis();

  return useEntityById<MatchResponse>(
    "matches",
    (matchId: number) => mobile.matches.getMatchById(matchId),
    id
  );
};
