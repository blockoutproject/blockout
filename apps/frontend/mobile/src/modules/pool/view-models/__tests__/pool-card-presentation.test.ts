import {
  FormatEnum,
  GenderEnum,
  type PoolSummaryResponse,
} from "@/src/shared/generated/models";
import { toPoolCardPresentation } from "@/src/modules/pool/view-models/pool-card-presentation";

const palette = {
  neutral: "#999999",
  male: "#0055ff",
  female: "#ff3399",
  mixed: "#663399",
};

describe("toPoolCardPresentation", () => {
  it("includes regional league metadata and division colors", () => {
    const pool = {
      id: 1,
      name: "Poule A",
      shortName: "A",
      gender: GenderEnum.F,
      format: FormatEnum.FOUR,
      season: "2026",
      leagueCode: "aura",
      leagueName: "Auvergne-Rhône-Alpes",
      division: {
        name: "Régionale 1",
        logoUrl: "https://example.com/division.png",
        mainColor: "#123456",
        firstGradientColor: "#111111",
        secondGradientColor: "#222222",
        thirdGradientColor: "#333333",
      },
    } as PoolSummaryResponse;

    expect(toPoolCardPresentation(pool, palette)).toEqual({
      title: "Poule A",
      imageUri: "https://example.com/division.png",
      gradient: ["#111111", "#222222", "#333333"],
      metadata: [
        { label: "Régionale 1", color: "#123456" },
        { label: "Auvergne-Rhône-Alpes", color: "#999999" },
        { label: "Féminin", color: "#ff3399" },
        { label: "2026", color: "#999999" },
        { label: "4x4", color: "#999999" },
      ],
    });
  });
});
