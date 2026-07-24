import { useApis } from "@/src/shared/providers/api-provider";
import { useEntityById } from "@/src/shared/hooks/use-entity-by-id";
import type { ClubResponse } from "@/src/shared/generated/models";

export const useClubById = (id?: string) => {
  const { mobile } = useApis();

  return useEntityById<ClubResponse, string>(
    "clubs",
    (clubId: string) => mobile.clubs.getClubById(clubId),
    id,
  );
};
