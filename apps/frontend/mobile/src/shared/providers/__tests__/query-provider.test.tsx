import React from "react";
import {
  act,
  render,
  renderHook,
  waitFor,
} from "@testing-library/react-native";
import { AppState, Platform, Text } from "react-native";
import {
  focusManager,
  onlineManager,
  QueryClient,
  QueryClientProvider,
} from "@tanstack/react-query";
import * as Network from "expo-network";

import {
  createMobileQueryClient,
  QueryProvider,
  useResetQueryCache,
} from "@/src/shared/providers/query-provider";

jest.mock("expo-network", () => ({
  addNetworkStateListener: jest.fn(),
  getNetworkStateAsync: jest.fn(),
}));

describe("mobile Query provider", () => {
  const originalPlatform = Platform.OS;

  afterEach(() => {
    Object.defineProperty(Platform, "OS", { value: originalPlatform });
    jest.restoreAllMocks();
  });

  it("uses explicit shared query and mutation defaults", () => {
    const defaults = createMobileQueryClient().getDefaultOptions();

    expect(defaults.queries).toMatchObject({
      staleTime: 30_000,
      retry: 1,
      refetchOnReconnect: true,
      refetchOnWindowFocus: true,
    });
    expect(defaults.mutations).toMatchObject({ retry: 0 });
  });

  it("forwards native focus and connectivity changes to TanStack Query", async () => {
    Object.defineProperty(Platform, "OS", { value: "ios" });
    Object.defineProperty(AppState, "currentState", {
      configurable: true,
      value: "active",
    });

    let appStateListener:
      ((status: "active" | "background") => void) | undefined;
    let networkListener:
      ((state: { isConnected: boolean }) => void) | undefined;
    const removeAppStateListener = jest.fn();
    const removeNetworkListener = jest.fn();

    jest.spyOn(AppState, "addEventListener").mockImplementation(((
      _type,
      listener,
    ) => {
      appStateListener = listener;
      return { remove: removeAppStateListener };
    }) as typeof AppState.addEventListener);
    jest
      .mocked(Network.addNetworkStateListener)
      .mockImplementation((listener) => {
        networkListener = listener;
        return { remove: removeNetworkListener };
      });
    jest
      .mocked(Network.getNetworkStateAsync)
      .mockResolvedValue({ isConnected: true });

    const focusSpy = jest.spyOn(focusManager, "setFocused");
    const onlineSpy = jest.spyOn(onlineManager, "setOnline");

    const screen = await render(
      <QueryProvider>
        <Text>ready</Text>
      </QueryProvider>,
    );

    await waitFor(() => {
      expect(focusSpy).toHaveBeenCalledWith(true);
      expect(onlineSpy).toHaveBeenCalledWith(true);
    });

    await act(async () => {
      appStateListener?.("background");
      networkListener?.({ isConnected: false });
    });

    expect(focusSpy).toHaveBeenLastCalledWith(false);
    expect(onlineSpy).toHaveBeenLastCalledWith(false);

    await act(async () => {
      screen.unmount();
    });
    expect(removeAppStateListener).toHaveBeenCalledTimes(1);
    expect(removeNetworkListener).toHaveBeenCalledTimes(1);
  });

  it("cancels active queries before clearing session-owned cache data", async () => {
    const queryClient = new QueryClient();
    queryClient.setQueryData(["current-user"], { id: 7 });
    const cancelQueries = jest.spyOn(queryClient, "cancelQueries");
    const wrapper = ({ children }: React.PropsWithChildren) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
    const { result } = await renderHook(() => useResetQueryCache(), {
      wrapper,
    });

    await act(async () => {
      await result.current();
    });

    expect(cancelQueries).toHaveBeenCalledTimes(1);
    expect(queryClient.getQueryData(["current-user"])).toBeUndefined();
  });
});
