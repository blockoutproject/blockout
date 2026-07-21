import {render, userEvent} from "@testing-library/react-native";
import React from "react";

import type {PoolMatchesResponse} from "@/src/modules/match/model/Match";
import {MatchStatus} from "@/src/modules/match/model/Match";
import MatchPoolSection from "@/src/modules/match/ui/MatchPoolSection";
import type {PoolResponse} from "@/src/modules/pool/model/Pool";
import {EnumFormat} from "@/src/types/enums/Format";
import {EnumGender} from "@/src/types/enums/Gender";
import {ThemeProvider} from "@/src/shared/providers/ThemeProvider";

jest.mock("expo-router", () => ({
  useRouter: () => ({push: jest.fn()}),
}));

jest.mock("@/src/hooks/ads/useNavigationInterstitial", () => ({
  useNavigationInterstitial: () => ({
    handleNavigationWithAd: (navigate: () => void) => navigate(),
  }),
}));

jest.mock("expo-haptics", () => ({
  selectionAsync: jest.fn().mockResolvedValue(undefined),
}));

const pool: PoolResponse = {
  id: 20,
  season: "2025/2026",
  leagueCode: "FFVB",
  leagueName: "Nationale",
  poolCode: "N2A",
  name: "Nationale 2 - Poule A",
  shortName: "N2A",
  rawName: "N2A",
  format: EnumFormat.SIX,
  gender: EnumGender.M,
  followersCount: 4,
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
};

const poolMatches: PoolMatchesResponse = {
  pool,
  matches: [
    {
      id: 42,
      liveCode: null,
      matchDate: "2025-11-08T18:30:00Z",
      season: "2025/2026",
      set: null,
      score: null,
      status: MatchStatus.UPCOMING,
      venue: null,
      firstReferee: null,
      secondReferee: null,
      liveUrl: null,
      liveProvider: null,
      liveOwnerAuth0Id: null,
      teamA: {
        id: 1,
        clubId: "club-a",
        rawName: "Blockout A",
        name: "Blockout A",
        shortName: "BO A",
        leagueCode: "FFVB",
        divisionId: 3,
        format: EnumFormat.SIX,
        gender: EnumGender.M,
        season: "2025/2026",
        logoUrl: null,
        followersCount: 2,
        active: true,
        createdAt: "2025-01-01T00:00:00Z",
        lastUpdate: "2025-01-01T00:00:00Z",
      },
      teamB: {
        id: 2,
        clubId: "club-b",
        rawName: "Blockout B",
        name: "Blockout B",
        shortName: "BO B",
        leagueCode: "FFVB",
        divisionId: 3,
        format: EnumFormat.SIX,
        gender: EnumGender.M,
        season: "2025/2026",
        logoUrl: null,
        followersCount: 3,
        active: true,
        createdAt: "2025-01-01T00:00:00Z",
        lastUpdate: "2025-01-01T00:00:00Z",
      },
      matchAddressPdfUrl: null,
      matchSheetPdfUrl: null,
      pool,
    },
  ],
};

describe("MatchPoolSection", () => {
  it("exposes a match as an accessible domain action", async () => {
    const handleMatchPress = jest.fn();
    const user = userEvent.setup();
    const screen = await render(
      <ThemeProvider>
        <MatchPoolSection
          poolMatches={poolMatches}
          handleMatchPress={handleMatchPress}
        />
      </ThemeProvider>,
    );

    const matchAction = screen.getByRole("button", {
      name: "Ouvrir le match BO A contre BO B",
    });
    expect(matchAction).toBe(screen.getByTestId("match-item-42"));

    await user.press(matchAction);

    expect(handleMatchPress).toHaveBeenCalledWith(42);
  });
});
