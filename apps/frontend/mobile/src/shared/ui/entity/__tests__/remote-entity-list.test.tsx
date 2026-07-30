import {
  act,
  fireEvent,
  render,
  userEvent,
  waitFor,
} from "@testing-library/react-native";
import * as Haptics from "expo-haptics";
import React from "react";
import { Text } from "react-native";

import { ThemeProvider } from "@/src/shared/theme";
import RemoteEntityList, {
  type RemoteEntityListFeedback,
} from "@/src/shared/ui/entity/remote-entity-list";

jest.mock("@shopify/flash-list", () => {
  const ReactModule = require("react") as typeof React;
  const { View } = require("react-native");

  return {
    FlashList: ({
      data,
      keyExtractor,
      ListEmptyComponent,
      ListFooterComponent,
      renderItem,
      ...props
    }: {
      data: Item[];
      keyExtractor: (item: Item, index: number) => string;
      ListEmptyComponent?: React.ReactElement;
      ListFooterComponent?: React.ReactElement;
      renderItem: (input: {
        item: Item;
        index: number;
        target: "Cell";
      }) => React.ReactNode;
    }) =>
      ReactModule.createElement(
        View,
        props,
        data.length > 0
          ? data.map((item, index) =>
              ReactModule.createElement(
                ReactModule.Fragment,
                { key: keyExtractor(item, index) },
                renderItem({ item, index, target: "Cell" }),
              ),
            )
          : ListEmptyComponent,
        ListFooterComponent,
      ),
  };
});

jest.mock("expo-haptics", () => ({
  ImpactFeedbackStyle: { Medium: "medium" },
  impactAsync: jest.fn().mockResolvedValue(undefined),
  selectionAsync: jest.fn().mockResolvedValue(undefined),
}));

jest.mock("expo-image", () => ({
  Image: "Image",
}));

jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 10, left: 0 }),
}));

const feedback = {
  loadingTestID: "entity-loading",
  error: {
    subtitle: "Impossible de charger les entités.",
    testID: "entity-error",
    retryTestID: "entity-error-retry-action",
  },
  empty: {
    title: "Aucune entité",
    retryLabel: "Réessayer",
    testID: "entity-empty",
    retryTestID: "entity-empty-retry-action",
  },
} satisfies RemoteEntityListFeedback;

type Item = {
  id: number;
  name: string;
};

type RenderListProps = {
  data?: Item[];
  isError?: boolean;
  isLoading?: boolean;
  onEndReached?: () => void;
  onRefresh?: () => Promise<unknown>;
  onRetry?: () => unknown;
};

const renderList = ({
  data = [],
  isError = false,
  isLoading = false,
  onEndReached,
  onRefresh = jest.fn().mockResolvedValue(undefined),
  onRetry,
}: RenderListProps = {}) =>
  render(
    <ThemeProvider>
      <RemoteEntityList
        data={data}
        feedback={feedback}
        footerSpacing={4}
        isError={isError}
        isLoading={isLoading}
        keyExtractor={(item) => String(item.id)}
        onEndReached={onEndReached}
        onRefresh={onRefresh}
        onRetry={onRetry}
        renderItem={({ item }) => (
          <Text testID={`entity-item-${item.id}`}>{item.name}</Text>
        )}
        testID="entity-list"
      />
    </ThemeProvider>,
  );

describe("RemoteEntityList", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders loading and error states without a false success list", async () => {
    const screen = await renderList({ isLoading: true });

    expect(screen.getByTestId("entity-loading")).toBeTruthy();
    expect(screen.queryByTestId("entity-list")).toBeNull();

    const onRetry = jest.fn();
    await screen.rerender(
      <ThemeProvider>
        <RemoteEntityList
          data={[]}
          feedback={feedback}
          footerSpacing={4}
          isError
          isLoading={false}
          keyExtractor={(item: Item) => String(item.id)}
          onRefresh={jest.fn().mockResolvedValue(undefined)}
          onRetry={onRetry}
          renderItem={({ item }) => <Text>{item.name}</Text>}
          testID="entity-list"
        />
      </ThemeProvider>,
    );

    expect(screen.getByTestId("entity-error")).toBeTruthy();
    expect(screen.queryByTestId("entity-list")).toBeNull();

    await userEvent
      .setup()
      .press(screen.getByTestId("entity-error-retry-action"));

    await waitFor(() => {
      expect(onRetry).toHaveBeenCalledTimes(1);
    });
    expect(Haptics.impactAsync).not.toHaveBeenCalled();
  });

  it("renders explicit empty and successful virtualized states", async () => {
    const onRetry = jest.fn();
    const screen = await renderList({ onRetry });

    expect(screen.getByTestId("entity-empty")).toBeTruthy();
    expect(screen.queryByTestId("entity-item-42")).toBeNull();

    await userEvent
      .setup()
      .press(screen.getByTestId("entity-empty-retry-action"));
    await waitFor(() => {
      expect(onRetry).toHaveBeenCalledTimes(1);
    });

    await screen.rerender(
      <ThemeProvider>
        <RemoteEntityList
          data={[{ id: 42, name: "Blockout" }]}
          feedback={feedback}
          footerSpacing={4}
          isError={false}
          isLoading={false}
          keyExtractor={(item: Item) => String(item.id)}
          onRefresh={jest.fn().mockResolvedValue(undefined)}
          renderItem={({ item }) => (
            <Text testID={`entity-item-${item.id}`}>{item.name}</Text>
          )}
          testID="entity-list"
        />
      </ThemeProvider>,
    );

    expect(screen.getByTestId("entity-list")).toBeTruthy();
    expect(screen.getByTestId("entity-item-42")).toHaveTextContent("Blockout");
    expect(screen.queryByTestId("entity-empty")).toBeNull();
  });

  it("owns haptic pull-to-refresh and forwards pagination", async () => {
    let resolveRefresh: (() => void) | undefined;
    const refreshPromise = new Promise<void>((resolve) => {
      resolveRefresh = resolve;
    });
    const onRefresh = jest.fn(() => refreshPromise);
    const onEndReached = jest.fn();
    const screen = await renderList({
      data: [{ id: 42, name: "Blockout" }],
      onEndReached,
      onRefresh,
    });

    fireEvent(screen.getByTestId("entity-list"), "refresh");

    await waitFor(() => {
      expect(Haptics.impactAsync).toHaveBeenCalledWith("medium");
      expect(onRefresh).toHaveBeenCalledTimes(1);
    });

    await act(async () => {
      resolveRefresh?.();
      await refreshPromise;
    });

    onEndReached.mockClear();
    fireEvent(screen.getByTestId("entity-list"), "endReached");
    expect(onEndReached).toHaveBeenCalledTimes(1);
  });

  it("uses the managed refresh command when retry has no feature override", async () => {
    const onRefresh = jest.fn().mockResolvedValue(undefined);
    const screen = await renderList({ onRefresh });

    await userEvent
      .setup()
      .press(screen.getByTestId("entity-empty-retry-action"));

    await waitFor(() => {
      expect(Haptics.impactAsync).toHaveBeenCalledWith("medium");
      expect(onRefresh).toHaveBeenCalledTimes(1);
    });
  });

  it("can preserve a passive empty state for feature-owned retry behavior", async () => {
    const screen = await render(
      <ThemeProvider>
        <RemoteEntityList
          data={[]}
          feedback={feedback}
          footerSpacing={4}
          includeBottomNavigationSpacing={false}
          isError={false}
          isLoading={false}
          keyExtractor={(item: Item) => String(item.id)}
          onRefresh={jest.fn().mockResolvedValue(undefined)}
          renderItem={({ item }) => <Text>{item.name}</Text>}
          scrollWhenEmpty
          showEmptyRetry={false}
          testID="entity-list"
        />
      </ThemeProvider>,
    );

    expect(screen.getByTestId("entity-empty")).toBeTruthy();
    expect(screen.queryByTestId("entity-empty-retry-action")).toBeNull();
    expect(screen.getByTestId("entity-list").props.scrollEnabled).toBe(true);
  });
});
