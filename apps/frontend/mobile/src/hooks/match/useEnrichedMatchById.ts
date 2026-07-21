import {useApis} from "@/src/shared/providers/ApiProvider";
import {useEntityById} from "@/src/shared/hooks/useEntityById";
import {EnrichedMatchDTO} from "@/src/types/Match";

export const useEnrichedMatchById = (id?: number) => {
  const {mobile} = useApis();

  return useEntityById<EnrichedMatchDTO>(
    "enrichedMatches",
    (matchId: number) => mobile.matches.getEnrichedMatchById(matchId),
    id
  );
};
