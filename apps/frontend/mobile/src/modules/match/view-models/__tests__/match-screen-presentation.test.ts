import { createMatchScreenPresentation } from "@/src/modules/match/view-models/match-screen-presentation";
import { darkTheme } from "@/src/shared/theme";

const match = {
  matchDate: "2026-04-25T18:30:00Z",
  set: "3-1",
  liveUrl: "https://example.com/live",
  teamA: { id: 1 },
  teamB: { id: 2 },
  pool: {
    leagueCode: "FFVB",
    division: {
      firstGradientColor: "#111111",
      mainColor: "#222222",
      secondGradientColor: "#333333",
      thirdGradientColor: "#444444",
    },
  },
};

describe("match screen presentation", () => {
  it("derives score highlights, gradient, time, and live visibility", () => {
    const presentation = createMatchScreenPresentation(match, darkTheme, false);

    expect(presentation.gradient).toEqual(["#111111", "#333333", "#444444"]);
    expect(presentation.highlightTeams.map(({ teamId }) => teamId)).toEqual([
      1, 2,
    ]);
    expect(presentation.timeText).toEqual(expect.any(String));
    expect(presentation.showLiveLinkCard).toBe(true);
  });

  it("keeps LNV live-link presentation hidden", () => {
    expect(
      createMatchScreenPresentation(
        {
          ...match,
          pool: { ...match.pool, leagueCode: "AALNV" },
        },
        darkTheme,
        true,
      ).showLiveLinkCard,
    ).toBe(false);
  });
});
