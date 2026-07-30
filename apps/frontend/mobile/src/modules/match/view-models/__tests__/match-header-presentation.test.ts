import { getFfvbCalendarUrl } from "@/src/modules/match/view-models/match-header-presentation";

describe("match header presentation", () => {
  it("builds the FFVB calendar link from explicit match coordinates", () => {
    expect(
      getFfvbCalendarUrl({
        leagueCode: "75",
        poolCode: "A",
        season: "2025/2026",
      }),
    ).toBe(
      "https://www.ffvbbeach.org/ffvbapp/resu/vbspo_calendrier.php?saison=2025%2F2026&codent=75&poule=A",
    );
  });

  it("does not expose a partial calendar link", () => {
    expect(
      getFfvbCalendarUrl({
        leagueCode: "75",
        poolCode: "",
        season: "2025/2026",
      }),
    ).toBeNull();
  });
});
