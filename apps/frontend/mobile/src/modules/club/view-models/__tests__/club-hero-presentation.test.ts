import type { ClubResponse } from "@/src/shared/generated/models";
import { toClubHeroPresentation } from "@/src/modules/club/view-models/club-hero-presentation";

describe("toClubHeroPresentation", () => {
  it("maps the club identity to the shared title hero", () => {
    const club = {
      name: "Blockout Club",
      logoUrl: "https://example.com/club.png",
    } as ClubResponse;

    expect(toClubHeroPresentation(club)).toEqual({
      title: "Blockout Club",
      avatarUri: "https://example.com/club.png",
      backgroundUri: "https://example.com/club.png",
    });
  });
});
