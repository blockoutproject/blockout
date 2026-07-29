import { render, userEvent, waitFor } from "@testing-library/react-native";
import React from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";

import FollowedPoolsList from "@/src/modules/followed/ui/followed-pools-list";
import {
  FormatEnum,
  GenderEnum,
  type PoolSummaryResponse,
} from "@/src/shared/generated/models";
import { ThemeProvider } from "@/src/shared/theme";

const mockPush = jest.fn();
const mockRefetch = jest.fn().mockResolvedValue(undefined);

const mockPools: PoolSummaryResponse[] = [
  {
    id: 11,
    name: "Poule A",
    shortName: "A",
    season: "2025/2026",
    gender: GenderEnum.M,
    format: FormatEnum.SIX,
    division: {
      id: 1,
      name: "Nationale 2",
      mainColor: "#123456",
      firstGradientColor: "#123456",
      secondGradientColor: "#234567",
      thirdGradientColor: "#345678",
      logoUrl: null,
      active: true,
      createdAt: "2026-01-01T00:00:00Z",
      lastUpdate: "2026-01-01T00:00:00Z",
    },
    leagueCode: "FFVB",
    leagueName: "FFVolley",
  },
  {
    id: 12,
    name: "Poule B",
    shortName: "B",
    season: "2024/2025",
    gender: GenderEnum.F,
    format: FormatEnum.SIX,
    division: {
      id: 2,
      name: "Régionale",
      mainColor: "#654321",
      firstGradientColor: "#654321",
      secondGradientColor: "#765432",
      thirdGradientColor: "#876543",
      logoUrl: null,
      active: true,
      createdAt: "2026-01-01T00:00:00Z",
      lastUpdate: "2026-01-01T00:00:00Z",
    },
    leagueCode: "REGIONAL",
    leagueName: "Ligue régionale",
  },
];

jest.mock("@/src/modules/pool/hooks/use-followed-pool-list", () => ({
  useFollowedPoolList: () => ({
    pools: mockPools,
    isLoading: false,
    isError: false,
    refetch: mockRefetch,
  }),
}));

jest.mock("expo-router", () => ({
  useRouter: () => ({ push: mockPush }),
}));

jest.mock(
  "@/src/modules/advertising/hooks/use-navigation-interstitial",
  () => ({
    useNavigationInterstitial: () => ({
      handleNavigationWithAd: (navigate: () => void) => navigate(),
    }),
  }),
);

jest.mock("expo-haptics", () => ({
  ImpactFeedbackStyle: { Medium: "medium" },
  impactAsync: jest.fn().mockResolvedValue(undefined),
  selectionAsync: jest.fn().mockResolvedValue(undefined),
}));

describe("FollowedPoolsList", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("filters by season and navigates from a stable domain item", async () => {
    const onSeasonsChange = jest.fn();
    const user = userEvent.setup();
    const screen = await render(
      <SafeAreaProvider
        initialMetrics={{
          frame: { x: 0, y: 0, width: 390, height: 844 },
          insets: { top: 0, right: 0, bottom: 0, left: 0 },
        }}
      >
        <ThemeProvider>
          <FollowedPoolsList
            poolIds={[11, 12]}
            selectedSeason="2025/2026"
            onSeasonsChange={onSeasonsChange}
          />
        </ThemeProvider>
      </SafeAreaProvider>,
    );

    expect(screen.getByTestId("followed-pool-list")).toBeTruthy();
    expect(screen.getByTestId("followed-pool-item-11")).toBeTruthy();
    expect(screen.queryByTestId("followed-pool-item-12")).toBeNull();
    await waitFor(() => {
      expect(onSeasonsChange).toHaveBeenCalledWith(["2025/2026", "2024/2025"]);
    });

    await user.press(screen.getByTestId("followed-pool-item-11"));

    expect(mockPush).toHaveBeenCalledWith("/pool/11");
  });
});
