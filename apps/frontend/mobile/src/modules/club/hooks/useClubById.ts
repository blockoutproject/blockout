import { useApis } from "@/src/shared/providers/ApiProvider";
import { useEntityById } from "@/src/shared/hooks/useEntityById";
import type { ClubResponse } from "@/src/modules/club/model/Club";

export const useClubById = (id?: string) => {
  const { mobile } = useApis();

  return useEntityById<ClubResponse>(
    "clubs",
    (clubId: string) => mobile.clubs.getClubById(clubId),
    id,
  );
};
