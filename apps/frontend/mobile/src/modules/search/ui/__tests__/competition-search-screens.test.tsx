import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, userEvent, waitFor } from "@testing-library/react-native";
import React from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";

import SearchPoolScreen from "@/src/modules/search/ui/search-pool-screen";
import SearchTeamScreen from "@/src/modules/search/ui/search-team-screen";
import { ThemeProvider } from "@/src/shared/theme";

const mockDismiss = jest.fn();
const mockPresent = jest.fn();
const mockSearchPools = jest.fn().mockResolvedValue([]);
const mockSearchTeams = jest.fn().mockResolvedValue([]);

jest.mock("@/src/shared/providers/api-provider", () => ({
  useApis: () => ({
    mobile: {
      divisions: {
        getDivisions: jest.fn().mockResolvedValue([
          {
            id: 12,
            name: "Nationale 2",
            active: true,
          },
        ]),
      },
      search: {
        searchPools: mockSearchPools,
        searchTeams: mockSearchTeams,
      },
    },
  }),
}));

jest.mock("expo-router", () => ({
  useRouter: () => ({ push: jest.fn() }),
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
  selectionAsync: jest.fn().mockResolvedValue(undefined),
}));

jest.mock("@gorhom/bottom-sheet", () => {
  const ReactModule = require("react") as typeof React;
  const { TextInput, View } = require("react-native");

  return {
    BottomSheetBackdrop: View,
    BottomSheetTextInput: TextInput,
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

const renderScreen = (screen: React.ReactElement) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        gcTime: Infinity,
        retry: false,
      },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <SafeAreaProvider
        initialMetrics={{
          frame: { x: 0, y: 0, width: 390, height: 844 },
          insets: { top: 0, right: 0, bottom: 0, left: 0 },
        }}
      >
        <ThemeProvider>{screen}</ThemeProvider>
      </SafeAreaProvider>
    </QueryClientProvider>,
  );
};

describe("competition search screens", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it.each([
    ["team", SearchTeamScreen, mockSearchTeams],
    ["pool", SearchPoolScreen, mockSearchPools],
  ] as const)(
    "keeps the %s query explicit while sharing filter orchestration",
    async (entity, Screen, search) => {
      const user = userEvent.setup();
      const view = await renderScreen(
        <Screen search="" debouncedQuery="" setSearch={jest.fn()} />,
      );

      await waitFor(() => {
        expect(search).toHaveBeenCalledWith(
          "",
          undefined,
          undefined,
          undefined,
          undefined,
        );
      });

      await user.press(view.getByRole("button", { name: "2025/2026" }));
      await user.press(view.getByRole("button", { name: "Nationale 2" }));

      await waitFor(() => {
        expect(search).toHaveBeenLastCalledWith(
          "",
          "2025/2026",
          12,
          undefined,
          undefined,
        );
      });

      expect(view.getByTestId(`search-${entity}-list`)).toBeTruthy();
    },
  );
});
