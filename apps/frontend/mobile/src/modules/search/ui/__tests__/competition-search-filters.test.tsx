import { render, userEvent } from "@testing-library/react-native";
import React from "react";

import { useCompetitionSearchFilters } from "@/src/modules/search/hooks/use-competition-search-filters";
import CompetitionSearchFilterStrip from "@/src/modules/search/ui/competition-search-filters";
import { ThemeProvider } from "@/src/shared/theme";

const mockPresent = jest.fn();
const mockDismiss = jest.fn();

jest.mock("@/src/modules/division/hooks/use-divisions", () => ({
  useDivisions: () => ({
    data: [
      { id: 12, name: "Nationale 2", active: true },
      { id: 13, name: "Archivée", active: false },
    ],
  }),
}));

jest.mock("expo-haptics", () => ({
  selectionAsync: jest.fn().mockResolvedValue(undefined),
}));

jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
}));

jest.mock("@gorhom/bottom-sheet", () => {
  const ReactModule = require("react") as typeof React;
  const { View } = require("react-native");

  return {
    BottomSheetBackdrop: View,
    BottomSheetModal: ({
      children,
      ref,
    }: {
      children: React.ReactNode;
      ref?: React.Ref<unknown>;
    }) => {
      ReactModule.useImperativeHandle(ref, () => ({
        present: mockPresent,
        dismiss: mockDismiss,
      }));

      return ReactModule.createElement(View, null, children);
    },
    BottomSheetFlatList: ({
      data,
      keyExtractor,
      renderItem,
    }: {
      data: readonly { value: string | number; label: string }[];
      keyExtractor: (item: { value: string | number; label: string }) => string;
      renderItem: (input: {
        item: { value: string | number; label: string };
      }) => React.ReactNode;
    }) =>
      ReactModule.createElement(
        View,
        null,
        data.map((item) =>
          ReactModule.createElement(
            ReactModule.Fragment,
            { key: keyExtractor(item) },
            renderItem({ item }),
          ),
        ),
      ),
  };
});

const Harness = ({
  testIDPrefix,
}: {
  testIDPrefix: "search-pool" | "search-team";
}) => {
  const filters = useCompetitionSearchFilters();

  return (
    <ThemeProvider>
      <CompetitionSearchFilterStrip
        filters={filters}
        testIDPrefix={testIDPrefix}
      />
    </ThemeProvider>
  );
};

describe("CompetitionSearchFilterStrip", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it.each(["search-team", "search-pool"] as const)(
    "shares active division and season orchestration for %s",
    async (testIDPrefix) => {
      const user = userEvent.setup();
      const screen = await render(<Harness testIDPrefix={testIDPrefix} />);

      expect(screen.queryByRole("button", { name: "Archivée" })).toBeNull();
      expect(
        screen.getByTestId(`${testIDPrefix}-division-button`).props
          .accessibilityValue,
      ).toEqual({ text: "Division" });

      await user.press(screen.getByRole("button", { name: "Nationale 2" }));
      expect(
        screen.getByTestId(`${testIDPrefix}-division-button`).props
          .accessibilityValue,
      ).toEqual({ text: "Nationale 2" });

      await user.press(screen.getByRole("button", { name: "2025/2026" }));
      expect(
        screen.getByTestId(`${testIDPrefix}-season-button`).props
          .accessibilityValue,
      ).toEqual({ text: "2025/2026" });
    },
  );
});
