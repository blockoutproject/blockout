import type { ClubResponse } from "@/src/shared/generated/models";

export type ClubHeroPresentation = {
  title: string;
  avatarUri?: string | null;
  backgroundUri?: string | null;
};

export const toClubHeroPresentation = (
  club: ClubResponse,
): ClubHeroPresentation => ({
  title: club.name,
  avatarUri: club.logoUrl,
  backgroundUri: club.logoUrl,
});
