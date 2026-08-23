import { render, waitFor } from "@testing-library/react-native";
import React from "react";

import FollowedScreen from "@/src/modules/followed/ui/followed-screen";

let mockPoolRenderCount = 0;

jest.mock("@/src/shared/theme", () => ({
  useAppTheme: () => ({ background: "black" }),
}));

jest.mock("@/src/modules/followed/ui/followed-list-header", () => {
  const ReactModule = require("react") as typeof React;
  const ReactNative = require("react-native");

  return function FollowedListHeader({
    setFilters,
  }: {
    setFilters: React.Dispatch<React.SetStateAction<unknown[]>>;
  }) {
    ReactModule.useEffect(() => {
      setFilters([
        { name: "Équipes", isActive: false },
        { name: "Poules", isActive: true },
      ]);
    }, [setFilters]);
    return ReactModule.createElement(ReactNative.View, {
      testID: "followed-header",
    });
  };
});

jest.mock("@/src/modules/followed/ui/followed-teams-list", () => () => null);

jest.mock("@/src/modules/followed/ui/followed-pools-list", () => {
  const ReactModule = require("react") as typeof React;
  const ReactNative = require("react-native");

  return function FollowedPoolsList({
    onSeasonsChange,
    selectedSeason,
  }: {
    onSeasonsChange: (seasons: string[]) => void;
    selectedSeason?: string;
  }) {
    mockPoolRenderCount += 1;
    ReactModule.useEffect(() => {
      onSeasonsChange(["2025/2026"]);
    });
    return ReactModule.createElement(ReactNative.View, {
      testID: "followed-pools",
      accessibilityLabel: selectedSeason ?? "none",
    });
  };
});

jest.mock("@/src/shared/ui/form/season-select", () => () => null);

describe("FollowedScreen season ownership", () => {
  it("settles when the pool list republishes an equivalent season array", async () => {
    mockPoolRenderCount = 0;

    const screen = await render(
      <FollowedScreen poolIds={[11]} teamIds={[]} headerOffset={0} />,
    );

    await waitFor(() => {
      expect(
        screen.getByTestId("followed-pools").props.accessibilityLabel,
      ).toBe("2025/2026");
    });

    expect(mockPoolRenderCount).toBeLessThanOrEqual(3);
  });
});
