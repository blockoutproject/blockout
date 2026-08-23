import React from "react";
import { render, within } from "@testing-library/react-native";

import MatchScoreCard from "@/src/modules/match/ui/match-score-card";
import { ThemeProvider } from "@/src/shared/theme";
import {
  FormatEnum,
  GenderEnum,
  MatchStatusEnum,
  type MatchResponse,
  type TeamDetailsResponse,
} from "@/src/shared/generated/models";

jest.mock("expo-router", () => ({
  useRouter: () => ({ push: jest.fn() }),
}));

jest.mock("@/src/modules/advertising/providers/advertising-provider", () => ({
  useAdvertising: () => ({
    handleNavigationWithAd: (navigate: () => void) => navigate(),
  }),
}));

jest.mock("expo-haptics", () => ({
  selectionAsync: jest.fn().mockResolvedValue(undefined),
}));

jest.mock("@/src/shared/ui/images/masked-image", () => ({
  __esModule: true,
  default: () => null,
}));

const team = (id: number, shortName: string): TeamDetailsResponse => ({
  id,
  clubId: `club-${id}`,
  rawName: `Blockout ${shortName}`,
  name: `Blockout ${shortName}`,
  shortName,
  leagueCode: "FFVB",
  divisionId: 3,
  format: FormatEnum.SIX,
  gender: GenderEnum.M,
  season: "2098/2099",
  followersCount: 0,
  logoUrl: null,
  active: true,
  createdAt: "2025-01-01T00:00:00Z",
  lastUpdate: "2025-01-01T00:00:00Z",
});

const upcomingMatch: MatchResponse = {
  id: 42,
  liveCode: null,
  matchDate: "2099-11-08T18:30:00Z",
  season: "2098/2099",
  set: null,
  score: null,
  status: MatchStatusEnum.UPCOMING,
  venue: null,
  firstReferee: null,
  secondReferee: null,
  liveUrl: null,
  liveProvider: null,
  liveOwnerAuth0Id: null,
  teamA: team(1, "BO A"),
  teamB: team(2, "BO B"),
  matchAddressPdfUrl: null,
  matchSheetPdfUrl: null,
  pool: {
    id: 20,
    season: "2098/2099",
    poolCode: "N2A",
    leagueCode: "FFVB",
    leagueName: "Nationale",
    name: "Nationale 2 - Poule A",
    shortName: "N2A",
    rawName: "N2A",
    format: FormatEnum.SIX,
    gender: GenderEnum.M,
    followersCount: 0,
    ranking: [],
    division: {
      id: 3,
      name: "Nationale 2",
      mainColor: "#123456",
      firstGradientColor: "#123456",
      secondGradientColor: "#234567",
      thirdGradientColor: "#345678",
      logoUrl: null,
      active: true,
      createdAt: "2025-01-01T00:00:00Z",
      lastUpdate: "2025-01-01T00:00:00Z",
    },
  },
};

describe("MatchScoreCard", () => {
  it("keeps the upcoming status inside the central match column", async () => {
    const screen = await render(
      <ThemeProvider>
        <MatchScoreCard
          match={upcomingMatch}
          gradient={["#123456", "#234567"]}
        />
      </ThemeProvider>,
    );

    expect(
      within(screen.getByTestId("match-score-center-column")).getByText(
        "À venir",
      ),
    ).toBeTruthy();
  });
});
