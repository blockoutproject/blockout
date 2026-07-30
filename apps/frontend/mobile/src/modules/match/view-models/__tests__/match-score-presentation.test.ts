import {
  createMatchRowPresentation,
  createMatchScoreBreakdown,
  createMatchStatusPresentation,
} from "@/src/modules/match/view-models/match-score-presentation";

describe("match score presentation", () => {
  it("derives upcoming and live states from one status owner", () => {
    expect(
      createMatchStatusPresentation(
        {
          liveUrl: "https://example.com/live",
          matchDate: "2026-04-25T18:30:00Z",
          status: "UPCOMING",
        },
        new Date("2026-04-25T18:00:00Z"),
      ),
    ).toMatchObject({
      hasLiveLink: true,
      isFinished: false,
      isMatchStarted: false,
      isUpcoming: true,
      livePillLabel: "Live",
      time: expect.any(String),
    });
  });

  it("parses final and per-set scores once for the score table", () => {
    expect(
      createMatchScoreBreakdown({
        score: "25-20,22-25,15-12",
        set: "2-1",
      }),
    ).toEqual({
      awayFinal: "1",
      awaySets: [20, 25, 12],
      homeFinal: "2",
      homeSets: [25, 22, 15],
      maxSets: 3,
    });
  });

  it("keeps compact row status and time derivation bounded", () => {
    expect(
      createMatchRowPresentation({
        liveUrl: "https://example.com/replay",
        matchDate: "2026-04-25T18:30:00Z",
        status: "FINISHED",
      }),
    ).toMatchObject({
      isFinished: true,
      isUpcoming: false,
      livePillLabel: "Rediffusion",
      time: expect.any(String),
    });
  });
});
