import {useApis} from "@/src/context/ApiProvider";
import {useEntityById} from "../utils/useEntityById";
import {Club} from "@/src/types/Club";

export const useClubById = (id?: string) => {
  const {mobile} = useApis();

  return useEntityById<Club>(
    "clubs",
    (clubId: string) => mobile.clubs.getClubById(clubId),
    id
  );
};
