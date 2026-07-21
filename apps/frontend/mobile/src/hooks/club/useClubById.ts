import {useApis} from "@/src/shared/providers/ApiProvider";
import {useEntityById} from "@/src/shared/hooks/useEntityById";
import {Club} from "@/src/types/Club";

export const useClubById = (id?: string) => {
  const {mobile} = useApis();

  return useEntityById<Club>(
    "clubs",
    (clubId: string) => mobile.clubs.getClubById(clubId),
    id
  );
};
