import {
  FormatEnum,
  GenderEnum,
  type TeamResponse,
} from "@/src/shared/generated/models";
import { toTeamProfilePresentation } from "@/src/modules/team/view-models/team-profile-presentation";

const palette = {
  neutral: "#999999",
  male: "#0055ff",
  female: "#ff3399",
  mixed: "#663399",
};

describe("toTeamProfilePresentation", () => {
  it("keeps feature metadata and navigation ownership explicit", () => {
    const team = {
      clubId: "club-1",
      logoUrl: "https://example.com/team.png",
      gender: GenderEnum.M,
      format: FormatEnum.SIX,
      season: "2026",
      division: {
        name: "Elite",
        mainColor: "#123456",
        firstGradientColor: "#111111",
        secondGradientColor: "#222222",
        thirdGradientColor: "#333333",
      },
    } as TeamResponse;

    expect(toTeamProfilePresentation(team, palette)).toEqual({
      clubId: "club-1",
      imageUri: "https://example.com/team.png",
      gradient: ["#111111", "#222222", "#333333"],
      pills: [
        { label: "Elite", color: "#123456" },
        { label: "Masculin", color: "#0055ff" },
        { label: "6x6", color: "#999999" },
        { label: "2026", color: "#999999" },
      ],
    });
  });
});
