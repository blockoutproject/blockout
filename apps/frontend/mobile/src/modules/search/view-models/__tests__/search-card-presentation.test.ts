import {
  FormatEnum,
  GenderEnum,
  type ClubSearchResponse,
  type TeamSearchResponse,
} from "@/src/shared/generated/models";
import {
  toSearchClubCardPresentation,
  toSearchTeamCardPresentation,
} from "@/src/modules/search/view-models/search-card-presentation";

const palette = {
  neutral: "#999999",
  male: "#0055ff",
  female: "#ff3399",
  mixed: "#663399",
};

describe("search card presentations", () => {
  it("maps team metadata without leaking layout choices", () => {
    const team = {
      id: 1,
      name: "Blockout Volley",
      logoUrl: null,
      divisionName: "Elite",
      gender: GenderEnum.O,
      format: FormatEnum.TWO,
      season: "2026",
    } as TeamSearchResponse;

    expect(toSearchTeamCardPresentation(team, palette)).toEqual({
      title: "Blockout Volley",
      imageUri: null,
      metadata: [
        { label: "Elite", color: "#999999" },
        { label: "Mixte / Autre", color: "#663399" },
        { label: "2026", color: "#999999" },
        { label: "2x2", color: "#999999" },
      ],
    });
  });

  it("maps club location to the approved metadata slot", () => {
    const club = {
      id: "club-1",
      name: "Blockout Club",
      logoUrl: null,
      city: "Lyon",
    } satisfies ClubSearchResponse;

    expect(toSearchClubCardPresentation(club, palette)).toEqual({
      title: "Blockout Club",
      imageUri: null,
      metadata: [{ label: "Lyon", icon: "map-marker", color: "#999999" }],
    });
  });
});
