import {
  FormatEnum,
  GenderEnum,
  type TeamSummaryResponse,
} from "@/src/shared/generated/models";
import { toTeamCardPresentation } from "@/src/modules/team/view-models/team-card-presentation";

const palette = {
  neutral: "#999999",
  male: "#0055ff",
  female: "#ff3399",
  mixed: "#663399",
};

describe("toTeamCardPresentation", () => {
  it("maps transport data to the bounded entity-card presentation", () => {
    const team = {
      name: "Blockout Volley Senior",
      shortName: "Blockout",
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
    } as TeamSummaryResponse;

    expect(toTeamCardPresentation(team, palette)).toEqual({
      title: "Blockout",
      imageUri: "https://example.com/team.png",
      gradient: ["#111111", "#222222", "#333333"],
      metadata: [
        { label: "Elite", color: "#123456" },
        { label: "Masculin", color: "#0055ff" },
        { label: "2026", color: "#999999" },
        { label: "6x6", color: "#999999" },
      ],
    });
  });
});
