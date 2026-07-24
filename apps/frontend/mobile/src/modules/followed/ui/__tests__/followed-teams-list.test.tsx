import { render, userEvent, waitFor } from "@testing-library/react-native";
import React from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";

import type { TeamSummaryResponse } from "@/src/shared/generated/models";
import FollowedTeamsList from "@/src/modules/followed/ui/followed-teams-list";
import { ThemeProvider } from "@/src/shared/theme";

const mockPush = jest.fn();
const mockRefetch = jest.fn();

const teams = [
  {
    id: 1,
    name: "Blockout A",
    shortName: "BO A",
    season: "2025/2026",
    logoUrl: null,
    division: {
      name: "Nationale 2",
      mainColor: "#123456",
      firstGradientColor: "#123456",
      secondGradientColor: "#234567",
      thirdGradientColor: "#345678",
    },
  },
  {
    id: 2,
    name: "Blockout B",
    shortName: "BO B",
    season: "2024/2025",
    logoUrl: null,
    division: {
      name: "Régionale",
      mainColor: "#654321",
      firstGradientColor: "#654321",
      secondGradientColor: "#765432",
      thirdGradientColor: "#876543",
    },
  },
] as TeamSummaryResponse[];

jest.mock("@/src/modules/team/hooks/use-followed-team-list", () => ({
  useFollowedTeamList: () => ({
    teams,
    isLoading: false,
    isError: false,
    refetch: mockRefetch,
  }),
}));

jest.mock("expo-router", () => ({
  useRouter: () => ({ push: mockPush }),
}));

jest.mock("@/src/modules/advertising/use-navigation-interstitial", () => ({
  useNavigationInterstitial: () => ({
    handleNavigationWithAd: (navigate: () => void) => navigate(),
  }),
}));

jest.mock("expo-haptics", () => ({
  ImpactFeedbackStyle: { Medium: "medium" },
  impactAsync: jest.fn().mockResolvedValue(undefined),
  selectionAsync: jest.fn().mockResolvedValue(undefined),
}));

describe("FollowedTeamsList", () => {
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
          <FollowedTeamsList
            teamIds={[1, 2]}
            selectedSeason="2025/2026"
            onSeasonsChange={onSeasonsChange}
          />
        </ThemeProvider>
      </SafeAreaProvider>,
    );

    expect(screen.getByTestId("followed-team-list")).toBeTruthy();
    expect(screen.getByTestId("followed-team-item-1")).toBeTruthy();
    expect(screen.queryByTestId("followed-team-item-2")).toBeNull();
    await waitFor(() => {
      expect(onSeasonsChange).toHaveBeenCalledWith(["2025/2026", "2024/2025"]);
    });

    await user.press(screen.getByTestId("followed-team-item-1"));

    expect(mockPush).toHaveBeenCalledWith("/team/1");
  });
});
