import { GenderEnum, type PoolResponse } from "@/src/shared/generated/models";
import { toPoolProfilePresentation } from "@/src/modules/pool/view-models/pool-profile-presentation";

const palette = {
  neutral: "#999999",
  male: "#0055ff",
  female: "#ff3399",
  mixed: "#663399",
};

describe("toPoolProfilePresentation", () => {
  it("maps league and division metadata without exposing transport details", () => {
    const pool = {
      leagueName: "Ligue AURA",
      gender: GenderEnum.F,
      season: "2026",
      division: {
        name: "Régionale 1",
        logoUrl: "https://example.com/division.png",
        mainColor: "#123456",
        firstGradientColor: "#111111",
        secondGradientColor: "#222222",
        thirdGradientColor: "#333333",
      },
    } as PoolResponse;

    expect(toPoolProfilePresentation(pool, palette)).toEqual({
      imageUri: "https://example.com/division.png",
      gradient: ["#111111", "#222222", "#333333"],
      pills: [
        { label: "Ligue AURA", color: "#999999" },
        { label: "Régionale 1", color: "#123456" },
        { label: "Féminin", color: "#ff3399" },
        { label: "2026", color: "#999999" },
      ],
    });
  });
});
